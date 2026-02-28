import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { enviarTexto } from '@/lib/fotoia/whatsapp/wa-sender'
import { saveImageFromUrl } from '@/lib/fotoia/storage/storage-service'
import Anthropic from '@anthropic-ai/sdk'
import path from 'path'
import fs from 'fs'

// PhotoMaker — modelo face-condicionado no Replicate
const PHOTOMAKER_MODEL = 'tencentarc/photomaker-style:ddfc2b08d209f9fa8c1eca692712918bd449f695d786de39a1d4f0c4cbed1433'
const REPLICATE_API = 'https://api.replicate.com/v1/predictions'

const ESTILOS_TEMA: Record<string, string> = {
  profissional: 'Corporate (Suit)',
  empresarial:  'Corporate (Suit)',
  natal:        'Christmas Elf',
  'dia das maes': 'Artist',
  aniversario:  'Fairy Tale Fantasy',
  viagem:       'Vacation',
  ensaio:       'Actor',
  default:      'Photographic (Default)',
}

function detectarEstilo(tema: string): string {
  const t = tema.toLowerCase()
  for (const [chave, estilo] of Object.entries(ESTILOS_TEMA)) {
    if (t.includes(chave)) return estilo
  }
  return ESTILOS_TEMA.default
}

/**
 * Pede ao cliente o tema das fotos via WhatsApp.
 * Chamado quando pedido entra em COLETANDO_REQUISITOS.
 */
export async function coletarRequisitos(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true },
  })
  if (!pedido) return

  const telefone = pedido.lead.telefone
  if (!telefone) return

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.COLETANDO_REQUISITOS },
  })

  const mensagem =
    `📸 *Perfeito! Agora vamos personalizar suas fotos!*

` +
    `*1️⃣ Qual o tema das fotos?*

` +
    `_Exemplos: profissional, natal, dia das mães, aniversário, viagem, ensaio artístico, empresarial..._

` +
    `Me conte o tema e eu cuido do resto! 🎨`

  await enviarTexto(pedido.organizacaoId, telefone, mensagem)
  await registrarExecucao(pedidoId, 'coletar-requisitos', 'concluido', {})
}

/**
 * Processa o tema enviado pelo cliente via texto.
 */
export async function processarTema(
  pedidoId: string,
  tema: string,
  organizacaoId: string,
  telefone: string,
): Promise<void> {
  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { temaFoto: tema.trim() },
  })

  await enviarTexto(
    organizacaoId,
    telefone,
    `✅ Tema *${tema.trim()}* registrado!

🤳 *Agora me envie uma foto clara do seu rosto* (olhando para a câmera, boa iluminação) para que eu possa criar suas fotos personalizadas!`,
  )

  await registrarExecucao(pedidoId, 'processar-tema', 'concluido', { tema })
}

/**
 * Processa a foto de rosto enviada pelo cliente, salva e inicia a geração.
 */
export async function processarFotoCliente(
  pedidoId: string,
  imagemBuffer: Buffer,
  mimeType: string,
  organizacaoId: string,
  telefone: string,
): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    select: { id: true, temaFoto: true, pacote: true },
  })
  if (!pedido) return

  // Salvar foto do cliente localmente
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const dir = path.join(process.cwd(), 'public', 'uploads', 'foto-ia', 'clientes', pedidoId)
  fs.mkdirSync(dir, { recursive: true })
  const filename = `rosto.${ext}`
  fs.writeFileSync(path.join(dir, filename), imagemBuffer)
  const fotoClienteUrl = `/uploads/foto-ia/clientes/${pedidoId}/${filename}`

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { fotoClienteUrl },
  })

  await enviarTexto(
    organizacaoId,
    telefone,
    '📷 Foto recebida! Vou começar a produção das suas fotos agora. Isso pode levar alguns minutinhos ⚡✨',
  )

  await registrarExecucao(pedidoId, 'foto-cliente-recebida', 'concluido', { fotoClienteUrl })

  // Avançar para EM_PRODUCAO e gerar imagens
  const { onStatusChange } = await import('@/lib/fotoia/pipeline-orchestrator')
  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.EM_PRODUCAO },
  })
  await gerarImagens(pedidoId)
}

/**
 * Gera as imagens usando PhotoMaker (face-conditioned).
 */
export async function gerarImagens(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true },
  })
  if (!pedido) return

  // Verificar se já está gerando
  if (pedido.status === StatusPedidoFoto.EM_PRODUCAO && pedido.predictionId) return

  // Respeitar limite de geração simultânea
  const config = await prisma.fotoIAConfig.findUnique({
    where: { organizacaoId: pedido.organizacaoId },
  })
  const maxSimultaneos = config?.maxSimultaneos ?? 3

  const emProducao = await prisma.pedidoFotoIA.count({
    where: { organizacaoId: pedido.organizacaoId, status: StatusPedidoFoto.EM_PRODUCAO },
  })

  if (emProducao >= maxSimultaneos) {
    // Enfileirar para depois
    await prisma.geracaoQueue.upsert({
      where: { pedidoId },
      create: { pedidoId, prioridade: 5 },
      update: { processado: false },
    })
    return
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) throw new Error('REPLICATE_API_TOKEN não configurado')

  // Determinar quantas imagens pelo pacote
  const qtdImagens = pedido.pacote === 'BASICO' ? 5 : pedido.pacote === 'PREMIUM' ? 30 : 10
  // PhotoMaker gera 1 por vez — usamos num_outputs máx 4, rodadas múltiplas
  const numOutputs = Math.min(qtdImagens, 4)

  const tema = pedido.temaFoto ?? 'profissional'
  const estilo = detectarEstilo(tema)
  const prompt = `img, ${tema}, high quality, professional photography, natural lighting, sharp focus, realistic, ${pedido.descricao ?? ''}`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const webhookUrl = `${appUrl}/api/foto-ia/webhook/replicate`

  const body = {
    version: PHOTOMAKER_MODEL.split(':')[1],
    input: {
      prompt,
      input_image: `${appUrl}${pedido.fotoClienteUrl}`,
      style_name: estilo,
      num_outputs: numOutputs,
      num_inference_steps: 20,
      negative_prompt: 'blurry, low quality, distorted, ugly, deformed, bad anatomy, worst quality',
      style_strength_ratio: 20,
      guidance_scale: 5,
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  }

  const response = await fetch(REPLICATE_API, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Replicate error ${response.status}: ${err}`)
  }

  const prediction = await response.json() as { id: string }

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: {
      status: StatusPedidoFoto.EM_PRODUCAO,
      predictionId: prediction.id,
      tentativasGeracao: { increment: 1 },
      promptUsado: prompt,
    },
  })

  await registrarExecucao(pedidoId, 'gerar-imagens', 'concluido', {
    predictionId: prediction.id,
    modelo: 'photomaker-style',
    tema,
    estilo,
    numOutputs,
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
