import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { enviarTexto } from '@/lib/fotoia/whatsapp/wa-sender'
import { getPixConfig } from '@/lib/fotoia/payment/pix-manual'
import { validarComprovanteComIA } from '@/lib/fotoia/payment/pix-manual'
import { onStatusChange } from '@/lib/fotoia/pipeline-orchestrator'

async function getPixConfigForOrg(organizacaoId: string) {
  const dbConfig = await prisma.fotoIAConfig.findUnique({
    where: { organizacaoId },
    select: { pixChave: true, pixTipo: true, pixNome: true },
  })
  if (dbConfig?.pixChave) {
    return { chave: dbConfig.pixChave, tipo: dbConfig.pixTipo || 'cnpj', nome: dbConfig.pixNome || '' }
  }
  return getPixConfig()
}

const PACOTE_LABELS: Record<string, { label: string; qtd: number; revisoes: number }> = {
  BASICO:       { label: 'Básico',           qtd: 5,  revisoes: 1 },
  PROFISSIONAL: { label: 'Profissional ⭐',  qtd: 10, revisoes: 4 },
  PREMIUM:      { label: 'Premium',          qtd: 30, revisoes: 10 },
}

/**
 * Envia a chave PIX ao cliente via WhatsApp com copy empática.
 * Chamado após o cliente escolher o pacote.
 */
export async function gerarCobranca(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true },
  })
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)

  if (pedido.cobrancaId && pedido.status === StatusPedidoFoto.AGUARDANDO_PAGAMENTO) return

  const pix = await getPixConfigForOrg(pedido.organizacaoId)
  if (!pix) throw new Error('Chave PIX não configurada. Configure em Configurações → Integrações.')

  const nome = pedido.lead.nome.split(' ')[0]
  const telefone = pedido.lead.telefone
  const valor = Number(pedido.valorCobrado ?? 47)
  const pacoteInfo = PACOTE_LABELS[pedido.pacote ?? 'PROFISSIONAL'] ?? PACOTE_LABELS.PROFISSIONAL

  const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const mensagem =
    `Olá, ${nome}! 😊

` +
    `Ótima escolha! Seu pacote *${pacoteInfo.label}* está reservado com ` +
    `${pacoteInfo.qtd} fotos incríveis e ${pacoteInfo.revisoes} revisão(ões) incluída(s) ✨

` +
    `Para começarmos a produção, realize o PIX abaixo:

` +
    `💰 *Valor:* ${valorFmt}
` +
    `🔑 *Chave PIX (${pix.tipo}):* \`${pix.chave}\`
` +
    `👤 *Beneficiário:* ${pix.nome}

` +
    `Após o pagamento, é só me enviar o *comprovante aqui mesmo* que confirmo na hora e já dou início às suas fotos! 📸

` +
    `Qualquer dúvida, estou por aqui 🙏`

  await enviarTexto(pedido.organizacaoId, telefone!, mensagem)

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: {
      status: StatusPedidoFoto.AGUARDANDO_PAGAMENTO,
      cobrancaId: pedidoId,
      linkPagamento: pix.chave,
    },
  })

  await registrarExecucao(pedidoId, 'gerar-cobranca', 'concluido', {
    modo: 'pix_manual',
    chavePix: pix.chave,
    valor,
  })
}

/**
 * Processa imagem de comprovante recebida via WhatsApp.
 * Usa Claude Haiku para validar valor + destinatário.
 */
export async function processarComprovante(
  pedidoId: string,
  imagemBuffer: Buffer,
  mimeType: string,
  organizacaoId: string,
  telefone: string,
): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    select: { valorCobrado: true },
  })
  if (!pedido) return

  const pix = await getPixConfigForOrg(organizacaoId)
  if (!pix) return

  await enviarTexto(organizacaoId, telefone, '🔍 Analisando seu comprovante... Um momento!')

  await registrarExecucao(pedidoId, 'validar-comprovante', 'iniciado', { mimeType })

  let resultado
  try {
    resultado = await validarComprovanteComIA(
      imagemBuffer,
      mimeType,
      Number(pedido.valorCobrado ?? 0),
      pix.chave,
      pix.nome,
    )
  } catch (err) {
    await enviarTexto(
      organizacaoId,
      telefone,
      '⚠️ Não consegui processar o comprovante. Por favor, envie novamente como imagem (JPG ou PNG) ou PDF.',
    )
    await registrarExecucao(pedidoId, 'validar-comprovante', 'erro', { erro: String(err) })
    return
  }

  await registrarExecucao(pedidoId, 'validar-comprovante', resultado.valido ? 'concluido' : 'erro', resultado as unknown as Record<string, unknown>)

  if (!resultado.valido) {
    await enviarTexto(
      organizacaoId,
      telefone,
      `❌ Não consegui confirmar o pagamento.

_${resultado.motivo}_

Pode enviar o comprovante novamente? Certifique-se que o valor e o destinatário estão corretos 🙏`,
    )
    return
  }

  await confirmarPagamento(pedidoId)
  await enviarTexto(
    organizacaoId,
    telefone,
    '✅ *Pagamento confirmado!* Agora vou precisar de algumas informações para criar suas fotos incríveis 📸',
  )
  await onStatusChange(pedidoId, StatusPedidoFoto.PAGAMENTO_CONFIRMADO)
}

export async function confirmarPagamento(pedidoId: string): Promise<void> {
  await registrarExecucao(pedidoId, 'confirmar-pagamento', 'iniciado', {})
  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.PAGAMENTO_CONFIRMADO },
  })
  await registrarExecucao(pedidoId, 'confirmar-pagamento', 'concluido', {
    novoStatus: 'PAGAMENTO_CONFIRMADO',
  })
}

async function registrarExecucao(
  pedidoId: string,
  etapa: string,
  status: 'iniciado' | 'concluido' | 'erro',
  dados: Record<string, unknown>,
) {
  await prisma.execucaoFotoIA.create({
    data: { pedidoId, etapa, status, saida: dados as object },
  })
}
