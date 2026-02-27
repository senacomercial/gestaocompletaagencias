import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { startImageGeneration } from '@/lib/fotoia/image/replicate'

const PROMPTS_PADRAO: Record<string, { base: string; negativo: string }> = {
  RETRATO_PROFISSIONAL: {
    base: 'professional portrait photo, business attire, studio lighting, high quality, sharp focus, white background',
    negativo: 'casual clothing, bad lighting, blurry, low quality, distorted face',
  },
  FOTO_PRODUTO: {
    base: 'product photography, clean white background, professional lighting, high detail, commercial quality',
    negativo: 'dirty background, bad lighting, blurry, low quality',
  },
  FOTO_CORPORATIVA: {
    base: 'corporate team photo, professional business attire, modern office setting, friendly smiles',
    negativo: 'casual attire, bad lighting, blurry, unprofessional',
  },
  BANNER_REDES_SOCIAIS: {
    base: 'social media banner, modern design, vibrant colors, professional typography, eye-catching',
    negativo: 'old design, dull colors, text errors, low resolution',
  },
  FOTO_PERFIL: {
    base: 'professional profile photo, headshot, neutral background, good lighting, friendly expression',
    negativo: 'full body, bad lighting, blurry, casual setting',
  },
  CUSTOM: {
    base: 'professional photograph, high quality, detailed',
    negativo: 'low quality, blurry, distorted',
  },
}

/**
 * Agente Produtor IA — Geração de imagens via Replicate
 * Responsável por: PAGAMENTO_CONFIRMADO → EM_PRODUCAO (aguarda webhook)
 */
export async function gerarImagens(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { organizacao: { include: { fotoIAConfig: true } } },
  })
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)

  await registrarExecucao(pedidoId, 'gerar-imagens', 'iniciado', {})

  // Verificar se já está em produção (evitar duplicação)
  if (pedido.status === StatusPedidoFoto.EM_PRODUCAO) {
    await registrarExecucao(pedidoId, 'gerar-imagens', 'concluido', { motivo: 'já em produção' })
    return
  }

  // Adicionar à queue ou processar diretamente
  const config = pedido.organizacao.fotoIAConfig
  const maxSimultaneos = config?.maxSimultaneos ?? 3

  // Contar gerações ativas
  const ativas = await prisma.pedidoFotoIA.count({
    where: {
      organizacaoId: pedido.organizacaoId,
      status: StatusPedidoFoto.EM_PRODUCAO,
    },
  })

  if (ativas >= maxSimultaneos) {
    // Adicionar à queue
    await prisma.geracaoQueue.upsert({
      where: { pedidoId },
      create: { pedidoId, prioridade: 0 },
      update: { processado: false },
    })
    await registrarExecucao(pedidoId, 'gerar-imagens', 'concluido', { motivo: 'adicionado à queue' })
    return
  }

  await processarGeracao(pedido, config)
}

async function processarGeracao(
  pedido: {
    id: string
    tipoFoto: string
    descricao: string | null
    organizacaoId: string
    organizacao: { fotoIAConfig: { replicateModel: string; prompts: unknown; maxTentativas: number } | null }
  },
  config: { replicateModel: string; prompts: unknown; maxTentativas: number } | null,
): Promise<void> {
  const prompts = (config?.prompts as Record<string, { promptBase: string; promptNegativo: string }>) ?? {}
  const tipoPrompt = prompts[pedido.tipoFoto]
  const padrao = PROMPTS_PADRAO[pedido.tipoFoto] ?? PROMPTS_PADRAO.CUSTOM

  const promptBase = tipoPrompt?.promptBase ?? padrao.base
  const promptNegativo = tipoPrompt?.promptNegativo ?? padrao.negativo
  const promptFinal = pedido.descricao
    ? `${promptBase}, ${pedido.descricao}`
    : promptBase

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const webhookUrl = `${appUrl}/api/foto-ia/webhook/replicate`

  const { predictionId } = await startImageGeneration(
    { prompt: promptFinal, negativePrompt: promptNegativo, numOutputs: 4 },
    webhookUrl,
    config?.replicateModel,
  )

  await prisma.pedidoFotoIA.update({
    where: { id: pedido.id },
    data: {
      status: StatusPedidoFoto.EM_PRODUCAO,
      predictionId,
      promptUsado: promptFinal,
      tentativasGeracao: { increment: 1 },
    },
  })

  await registrarExecucao(pedido.id, 'gerar-imagens', 'concluido', {
    novoStatus: 'EM_PRODUCAO',
    predictionId,
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
