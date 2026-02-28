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
          BASICO:       { preco: 27, qtdImagens: 5,  revisoes: 1,  ativo: true },
          PROFISSIONAL: { preco: 47, qtdImagens: 10, revisoes: 4,  ativo: true },
          PREMIUM:      { preco: 97, qtdImagens: 30, revisoes: 10, ativo: true },
        },
        prompts: {},
        templates: {
          saudacao: '🤩 *Olá, {nome}!*\n\nQue tal ter fotos profissionais incríveis sem sair de casa? 📸✨\n\nCom o *FotoIA*, nossa IA transforma sua selfie em fotos de nível estúdio!\n\n📦 *Escolha seu pacote:*\n1️⃣ *Básico* — 5 fotos · R$ 27 · 1 revisão\n2️⃣ ⭐ *Profissional* — 10 fotos · R$ 47 · 4 revisões _(mais vendido!)_\n3️⃣ *Premium* — 30 fotos · R$ 97 · 10 revisões\n\n⏱️ Entrega em *até 48 horas!*\n\nQual pacote você prefere? Responda *1*, *2* ou *3* 😊',
          cobranca: 'Olá, {nome}! 😊\n\nÓtima escolha! Seu pacote *{pacote}* está reservado com {qtdFotos} fotos incríveis e {revisoes} revisão(ões) incluída(s) ✨\n\nPara começarmos a produção, realize o PIX abaixo:\n\n💰 *Valor:* R$ {valor}\n🔑 *Chave PIX ({tipoPix}):* `{chavePix}`\n👤 *Beneficiário:* {nomeBeneficiario}\n\nApós o pagamento, é só me enviar o *comprovante aqui mesmo* que confirmo na hora e já dou início às suas fotos! 📸',
          coletarTema: '🎨 *Pagamento confirmado, {nome}!*\n\nAgora me conta: qual é a *temática* que você deseja para as fotos?\n\n_Exemplos: profissional, natal, aniversário, viagem, ensaio artístico..._\n\nMe descreva com suas palavras! 😊',
          coletarFoto: 'Perfeito! Temática *{tema}* anotada ✅\n\nAgora preciso de uma *foto do seu rosto* para personalizar as imagens com o seu visual.\n\n📸 Envie uma selfie ou foto de rosto com:\n• Rosto centralizado e bem iluminado\n• Fundo neutro (se possível)\n• Olhando para a câmera\n\nAssim que receber, começo a produção! 🚀',
          emProducao: '⚡ *Sua foto está sendo gerada agora, {nome}!*\n\nEm breve vou te enviar os resultados aqui mesmo no WhatsApp. Fique de olho! 👀',
          entrega: '🎊 *Que ótimo! Suas fotos foram entregues com sucesso!*\n\nObrigado pela confiança no FotoIA! 💛\n\nFoi um prazer criar fotos incríveis para você! 📸✨',
          followup1: 'Oi, {nome}! 😊 Só passando para saber se ficou alguma dúvida sobre o *FotoIA*.\n\nAinda temos vagas para hoje! Qual pacote te interessou? 1️⃣ Básico (R$27) · 2️⃣ Profissional (R$47) · 3️⃣ Premium (R$97)',
          followup2: '{nome}, última chamada! 🔥 Nossa agenda está quase cheia para esta semana.\n\nGaranta agora suas fotos profissionais com IA! Responda *1*, *2* ou *3* para escolher seu pacote 📸',
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
