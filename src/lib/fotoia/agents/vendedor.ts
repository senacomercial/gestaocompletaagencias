import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { enviarTexto } from '@/lib/fotoia/whatsapp/wa-sender'
import { gerarCobranca } from './cobrador'
import { onStatusChange } from '@/lib/fotoia/pipeline-orchestrator'

const PACOTES = {
  BASICO:        { qtd: 5,  preco: 27,  revisoes: 1,  label: 'Básico' },
  PROFISSIONAL:  { qtd: 10, preco: 47,  revisoes: 4,  label: 'Profissional ⭐' },
  PREMIUM:       { qtd: 30, preco: 97,  revisoes: 10, label: 'Premium' },
} as const

type PacoteKey = keyof typeof PACOTES

/**
 * Reconhece a escolha de pacote digitada pelo cliente.
 */
function detectarPacote(texto: string): PacoteKey | null {
  const t = texto.trim().toLowerCase()
  if (t === '1' || t.includes('basic') || t.includes('básic') || t.includes('5 fotos')) return 'BASICO'
  if (t === '2' || t.includes('profiss') || t.includes('10 fotos')) return 'PROFISSIONAL'
  if (t === '3' || t.includes('premium') || t.includes('30 fotos')) return 'PREMIUM'
  return null
}

/**
 * Envia saudação + menu de pacotes ao lead.
 * Chamado quando o pedido chega em EM_QUALIFICACAO.
 */
export async function enviarBoasVindas(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true, organizacao: true },
  })
  if (!pedido) return

  const nome = pedido.lead.nome.split(' ')[0]
  const telefone = pedido.lead.telefone
  if (!telefone) return

  const mensagem =
    `🤩 *Olá, ${nome}!*

` +
    `Que tal ter fotos profissionais incríveis sem sair de casa? 📸✨

` +
    `Com o *FotoIA*, nossa IA transforma sua selfie em fotos de nível estúdio!

` +
    `📦 *Escolha seu pacote:*
` +
    `1️⃣ *Básico* — 5 fotos · R$ 27 · 1 revisão
` +
    `2️⃣ ⭐ *Profissional* — 10 fotos · R$ 47 · 4 revisões _(mais vendido!)_
` +
    `3️⃣ *Premium* — 30 fotos · R$ 97 · 10 revisões

` +
    `⏱️ Entrega em *até 48 horas!*

` +
    `Qual pacote você prefere? Responda *1*, *2* ou *3* 😊`

  await enviarTexto(pedido.organizacaoId, telefone, mensagem)

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.PROPOSTA_ENVIADA },
  })

  await registrarExecucao(pedidoId, 'enviar-boas-vindas', 'concluido', { telefone })
}

/**
 * Processa a escolha de pacote enviada pelo cliente via WhatsApp.
 */
export async function processarEscolhaPacote(
  pedidoId: string,
  texto: string,
  organizacaoId: string,
  telefone: string,
): Promise<void> {
  const chave = detectarPacote(texto)

  if (!chave) {
    await enviarTexto(
      organizacaoId,
      telefone,
      '😊 Não entendi sua escolha. Por favor, responda *1*, *2* ou *3*:\n\n1️⃣ Básico · R$ 27 · 5 fotos\n2️⃣ Profissional · R$ 47 · 10 fotos ⭐\n3️⃣ Premium · R$ 97 · 30 fotos',
    )
    return
  }

  const pacote = PACOTES[chave]

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: {
      pacote: chave,
      valorCobrado: pacote.preco,
      revisoesMaximas: pacote.revisoes,
    },
  })

  await registrarExecucao(pedidoId, 'escolha-pacote', 'concluido', { pacote: chave, valor: pacote.preco })

  // Cobrador envia a chave PIX
  await gerarCobranca(pedidoId)
}

/**
 * Executa follow-up automático (via cron).
 */
export async function executarFollowUp(pedidoId: string, rodada: 1 | 2): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true },
  })
  if (!pedido) return

  const novoStatus = rodada === 1 ? StatusPedidoFoto.FOLLOWUP_1 : StatusPedidoFoto.FOLLOWUP_2
  const nome = pedido.lead.nome.split(' ')[0]
  const telefone = pedido.lead.telefone

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: novoStatus },
  })

  if (telefone) {
    const msg = rodada === 1
      ? `Oi, ${nome}! 😊 Só passando para saber se ficou alguma dúvida sobre o *FotoIA*.

Ainda temos vagas para hoje! Qual pacote te interessou? 1️⃣ Básico (R$27) · 2️⃣ Profissional (R$47) · 3️⃣ Premium (R$97)`
      : `${nome}, última chamada! 🔥 Nossa agenda está quase cheia para esta semana.

Garante agora suas fotos profissionais com IA! Responda *1*, *2* ou *3* para escolher seu pacote 📸`
    await enviarTexto(pedido.organizacaoId, telefone, msg)
  }

  await registrarExecucao(pedidoId, `followup-${rodada}`, 'concluido', { novoStatus })
}

// qualificarLead mantido por compatibilidade com pipeline-orchestrator
export async function qualificarLead(pedidoId: string): Promise<void> {
  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.EM_QUALIFICACAO },
  })
  await registrarExecucao(pedidoId, 'qualificar-lead', 'concluido', {})
  // Encadeia imediatamente para envio da proposta via WhatsApp
  await enviarBoasVindas(pedidoId)
}

// enviarProposta agora chama enviarBoasVindas
export async function enviarProposta(pedidoId: string): Promise<void> {
  await enviarBoasVindas(pedidoId)
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
