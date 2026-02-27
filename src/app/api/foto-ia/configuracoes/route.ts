import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/foto-ia/configuracoes
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let config = await prisma.fotoIAConfig.findUnique({
    where: { organizacaoId: session.user.organizacaoId },
  })

  if (!config) {
    // Criar configuração padrão
    config = await prisma.fotoIAConfig.create({
      data: {
        organizacaoId: session.user.organizacaoId,
        precos: {
          RETRATO_PROFISSIONAL: { preco: 97, qtdImagens: 5, ativo: true },
          FOTO_PRODUTO: { preco: 147, qtdImagens: 10, ativo: true },
          FOTO_CORPORATIVA: { preco: 197, qtdImagens: 8, ativo: true },
          BANNER_REDES_SOCIAIS: { preco: 127, qtdImagens: 5, ativo: true },
          FOTO_PERFIL: { preco: 67, qtdImagens: 3, ativo: true },
          CUSTOM: { preco: 97, qtdImagens: 4, ativo: true },
        },
        prompts: {},
        templates: {
          saudacao: 'Olá {nome}! 👋 Vi que você tem interesse em fotos profissionais por IA. Posso te ajudar?',
          proposta: 'Olá {nome}! Preparei uma proposta especial para {tipoFoto}: {qtdFotos} fotos por apenas R$ {preco}. O que acha?',
          followup1: 'Oi {nome}! Só passando para verificar se você teve a chance de ver minha proposta. Ainda tenho disponibilidade! 😊',
          followup2: 'Olá {nome}! Última chamada — minha agenda está quase cheia. Quer garantir suas fotos profissionais?',
          linkPagamento: 'Ótimo {nome}! Aqui está o link para pagamento: {link} — assim que confirmar, já começo a produção! 🎨',
          emProducao: 'Suas fotos estão sendo produzidas agora, {nome}! Em breve você receberá o link para aprovação. ⚡',
          aguardandoAprovacao: 'Suas fotos ficaram incríveis, {nome}! Acesse o link para ver e aprovar: {link} 📸',
          entrega: 'Parabéns {nome}! Suas fotos foram aprovadas e entregues com sucesso! Foi um prazer trabalhar com você. 🌟',
        },
      },
    })
  }

  return NextResponse.json(config)
}

// PUT /api/foto-ia/configuracoes
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { precos, prompts, templates, replicateModel, gatewayProvider, storageProvider,
    maxSimultaneos, maxTentativas, timeoutFollowup, timeoutPerdido } = body

  const config = await prisma.fotoIAConfig.upsert({
    where: { organizacaoId: session.user.organizacaoId },
    create: {
      organizacaoId: session.user.organizacaoId,
      ...(precos !== undefined && { precos }),
      ...(prompts !== undefined && { prompts }),
      ...(templates !== undefined && { templates }),
      ...(replicateModel && { replicateModel }),
      ...(gatewayProvider && { gatewayProvider }),
      ...(storageProvider && { storageProvider }),
      ...(maxSimultaneos !== undefined && { maxSimultaneos }),
      ...(maxTentativas !== undefined && { maxTentativas }),
      ...(timeoutFollowup !== undefined && { timeoutFollowup }),
      ...(timeoutPerdido !== undefined && { timeoutPerdido }),
    },
    update: {
      ...(precos !== undefined && { precos }),
      ...(prompts !== undefined && { prompts }),
      ...(templates !== undefined && { templates }),
      ...(replicateModel && { replicateModel }),
      ...(gatewayProvider && { gatewayProvider }),
      ...(storageProvider && { storageProvider }),
      ...(maxSimultaneos !== undefined && { maxSimultaneos }),
      ...(maxTentativas !== undefined && { maxTentativas }),
      ...(timeoutFollowup !== undefined && { timeoutFollowup }),
      ...(timeoutPerdido !== undefined && { timeoutPerdido }),
    },
  })

  return NextResponse.json(config)
}
