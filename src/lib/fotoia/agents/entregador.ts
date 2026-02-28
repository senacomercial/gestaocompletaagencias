import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { enviarTexto, enviarImagens } from '@/lib/fotoia/whatsapp/wa-sender'
import { gerarImagens } from './produtor'
import Anthropic from '@anthropic-ai/sdk'
import path from 'path'
import fs from 'fs'

/**
 * Avalia a qualidade das fotos geradas usando Claude Haiku
 * e as envia ao cliente via WhatsApp.
 */
export async function avaliarQualidadeEEnviar(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true, imagens: { where: { tipo: 'gerada' }, orderBy: { criadoEm: 'asc' } } },
  })
  if (!pedido || pedido.imagens.length === 0) return

  const telefone = pedido.lead.telefone
  if (!telefone) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Avaliação de qualidade com Claude (apenas para a primeira imagem — amostra)
  let qualidadeOk = true
  try {
    qualidadeOk = await avaliarQualidadeImagem(pedido.imagens[0].url, appUrl)
  } catch {
    // Se falhar, envia mesmo assim
    qualidadeOk = true
  }

  if (!qualidadeOk) {
    // Qualidade insuficiente — regenerar silenciosamente
    await registrarExecucao(pedidoId, 'avaliar-qualidade', 'erro', { motivo: 'qualidade insuficiente' })
    await prisma.pedidoFotoIA.update({
      where: { id: pedidoId },
      data: { status: StatusPedidoFoto.PAGAMENTO_CONFIRMADO, predictionId: null },
    })
    await gerarImagens(pedidoId)
    return
  }

  await registrarExecucao(pedidoId, 'avaliar-qualidade', 'concluido', { aprovadas: pedido.imagens.length })

  // Montar URLs públicas
  const urlsImagens = pedido.imagens.map(img =>
    img.url.startsWith('http') ? img.url : `${appUrl}${img.url}`,
  )

  const nome = pedido.lead.nome.split(' ')[0]
  const qtd = urlsImagens.length

  // Enviar texto introdutório
  await enviarTexto(
    pedido.organizacaoId,
    telefone,
    `🎉 *${nome}, suas ${qtd} fotos ficaram incríveis!*

Dê uma olhada 👇`,
  )

  // Enviar imagens
  await enviarImagens(pedido.organizacaoId, telefone, urlsImagens)

  // Instruções de aprovação
  const qtdRevisoes = pedido.revisoesMaximas
  await enviarTexto(
    pedido.organizacaoId,
    telefone,
    `O que achou? 😊

` +
    `✅ Para *aprovar*, responda: *APROVADO*
` +
    `🔄 Para *solicitar revisão* (${qtdRevisoes - pedido.rodadasRevisao} restante(s)), responda: *REVISÃO [descreva o que deseja mudar]*

` +
    `_Exemplo: REVISÃO quero o fundo mais escuro e expressão mais séria_`,
  )

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.AGUARDANDO_APROVACAO },
  })

  await registrarExecucao(pedidoId, 'enviar-fotos-wa', 'concluido', {
    qtdImagens: qtd,
    novoStatus: 'AGUARDANDO_APROVACAO',
  })
}

/**
 * Processa a resposta do cliente (APROVADO ou REVISÃO ...).
 */
export async function processarRespostaCliente(
  pedidoId: string,
  texto: string,
  organizacaoId: string,
  telefone: string,
): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    select: { revisoesMaximas: true, rodadasRevisao: true },
  })
  if (!pedido) return

  const textoUpper = texto.trim().toUpperCase()

  // Aprovação
  if (textoUpper.startsWith('APROVADO') || textoUpper === '✅' || textoUpper === 'OK' || textoUpper === 'ÓTIMO' || textoUpper === 'OTIMO') {
    await aprovarEntrega(pedidoId)
    await enviarTexto(
      organizacaoId,
      telefone,
      `🎊 *Que ótimo! Suas fotos foram entregues com sucesso!*

Obrigado pela confiança no FotoIA! 💛

Foi um prazer criar fotos incríveis para você! 📸✨`,
    )
    return
  }

  // Revisão
  if (textoUpper.startsWith('REVISÃO') || textoUpper.startsWith('REVISAO') || textoUpper.startsWith('🔄')) {
    const revisoes = pedido.rodadasRevisao
    const maxRevisoes = pedido.revisoesMaximas

    if (revisoes >= maxRevisoes) {
      await enviarTexto(
        organizacaoId,
        telefone,
        `⚠️ Você já utilizou todas as ${maxRevisoes} revisão(ões) do seu pacote.

Para continuar com mais revisões, entre em contato para adquirir um upgrade! 😊`,
      )
      return
    }

    // Extrair observações do texto
    const observacoes = texto.replace(/^(revisão|revisao|🔄)\s*/i, '').trim()

    await prisma.pedidoFotoIA.update({
      where: { id: pedidoId },
      data: {
        status: StatusPedidoFoto.EM_REVISAO,
        rodadasRevisao: { increment: 1 },
        observacoes,
      },
    })

    await enviarTexto(
      organizacaoId,
      telefone,
      `✏️ *Entendido!* Vou refazer as fotos com as suas observações:

_"${observacoes}"_

Em breve te envio os novos resultados! ⚡`,
    )

    // Passar para produtor regenerar
    const { onStatusChange } = await import('@/lib/fotoia/pipeline-orchestrator')
    await onStatusChange(pedidoId, StatusPedidoFoto.EM_REVISAO)
    return
  }

  // Mensagem não reconhecida
  await enviarTexto(
    organizacaoId,
    telefone,
    `Hmm, não entendi sua resposta 😊

✅ Para *aprovar* responda: *APROVADO*
🔄 Para *revisão* responda: *REVISÃO [o que deseja mudar]*`,
  )
}

async function aprovarEntrega(pedidoId: string): Promise<void> {
  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: {
      status: StatusPedidoFoto.ENTREGUE,
      aprovadoEm: new Date(),
      entregueEm: new Date(),
      imagens: { updateMany: { where: { tipo: 'gerada' }, data: { aprovada: true } } },
    },
  })
  await registrarExecucao(pedidoId, 'entrega-confirmada', 'concluido', {})
}

async function avaliarQualidadeImagem(imagemUrl: string, appUrl: string): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return true // sem chave = não avaliar, assumir OK

  // Resolver URL local
  const urlCompleta = imagemUrl.startsWith('http') ? imagemUrl : `${appUrl}${imagemUrl}`

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: urlCompleta },
        },
        {
          type: 'text',
          text: 'Esta imagem é uma foto de retrato de boa qualidade? Responda apenas: SIM ou NAO',
        },
      ],
    }],
  })

  const txt = response.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('').toUpperCase()
  return !txt.includes('NAO') && !txt.includes('NÃO')
}

// Mantido para compatibilidade com o pipeline-orchestrator antigo
export async function enviarParaAprovacao(pedidoId: string): Promise<void> {
  await avaliarQualidadeEEnviar(pedidoId)
}

// Mantido para compatibilidade com /api/foto-ia/aprovar — aceita aprovação/revisão via HTTP
export async function processarAprovacao(
  pedidoId: string,
  aprovado: boolean,
  observacoes?: string,
): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true },
  })
  if (!pedido) return

  const texto = aprovado ? 'APROVADO' : `REVISÃO ${observacoes ?? ''}`
  const orgId = pedido.organizacaoId
  const telefone = pedido.lead.telefone ?? ''

  await processarRespostaCliente(pedidoId, texto, orgId, telefone)
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
