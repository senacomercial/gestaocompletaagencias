// =============================================================================
// Seed de Desenvolvimento — Sistema de Gestão Completa de Agências
// Cobre todos os módulos: CRM, WhatsApp, Projetos, Financeiro, Squad IA
// =============================================================================
// Uso: npm run prisma:seed  (ou npm run db:reset para reset completo)

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { addMonths, subMonths, addDays, subDays } from 'date-fns'

const prisma = new PrismaClient()

const hoje = new Date()
const mesPassado = subMonths(hoje, 1)
const doisMesesAtras = subMonths(hoje, 2)

async function main() {
  console.log('🌱 Iniciando seed completo de desenvolvimento...\n')

  // ─────────────────────────────────────────────────────────────
  // 1. ORGANIZAÇÃO
  // ─────────────────────────────────────────────────────────────
  const org = await prisma.organizacao.upsert({
    where: { slug: 'minha-agencia' },
    update: {},
    create: {
      nome: 'Minha Agência Digital',
      slug: 'minha-agencia',
    },
  })
  console.log(`✅ Organização: ${org.nome}`)

  // ─────────────────────────────────────────────────────────────
  // 2. USUÁRIOS
  // ─────────────────────────────────────────────────────────────
  const senhaHash = await bcrypt.hash('senha123', 12)

  const admin = await prisma.usuario.upsert({
    where: { email_organizacaoId: { email: 'admin@agencia.com', organizacaoId: org.id } },
    update: {},
    create: { nome: 'Administrador', email: 'admin@agencia.com', senha: senhaHash, role: 'ADMIN', organizacaoId: org.id },
  })
  const gestor = await prisma.usuario.upsert({
    where: { email_organizacaoId: { email: 'gestor@agencia.com', organizacaoId: org.id } },
    update: {},
    create: { nome: 'João Gestor', email: 'gestor@agencia.com', senha: senhaHash, role: 'GESTOR', organizacaoId: org.id },
  })
  const operacional = await prisma.usuario.upsert({
    where: { email_organizacaoId: { email: 'operacao@agencia.com', organizacaoId: org.id } },
    update: {},
    create: { nome: 'Maria Operacional', email: 'operacao@agencia.com', senha: senhaHash, role: 'OPERACIONAL', organizacaoId: org.id },
  })
  console.log(`✅ Usuários: ${admin.nome}, ${gestor.nome}, ${operacional.nome}`)

  // ─────────────────────────────────────────────────────────────
  // 3. TAGS
  // ─────────────────────────────────────────────────────────────
  const [tagEcommerce, tagPremium, tagIndicacao, tagStartup, tagSaaS, tagVarejo] = await Promise.all([
    prisma.tag.upsert({ where: { nome_organizacaoId: { nome: 'E-commerce', organizacaoId: org.id } }, update: {}, create: { nome: 'E-commerce', cor: '#D4AF37', organizacaoId: org.id } }),
    prisma.tag.upsert({ where: { nome_organizacaoId: { nome: 'Premium', organizacaoId: org.id } }, update: {}, create: { nome: 'Premium', cor: '#CD7F32', organizacaoId: org.id } }),
    prisma.tag.upsert({ where: { nome_organizacaoId: { nome: 'Indicação', organizacaoId: org.id } }, update: {}, create: { nome: 'Indicação', cor: '#22C55E', organizacaoId: org.id } }),
    prisma.tag.upsert({ where: { nome_organizacaoId: { nome: 'Startup', organizacaoId: org.id } }, update: {}, create: { nome: 'Startup', cor: '#A78BFA', organizacaoId: org.id } }),
    prisma.tag.upsert({ where: { nome_organizacaoId: { nome: 'SaaS', organizacaoId: org.id } }, update: {}, create: { nome: 'SaaS', cor: '#38BDF8', organizacaoId: org.id } }),
    prisma.tag.upsert({ where: { nome_organizacaoId: { nome: 'Varejo', organizacaoId: org.id } }, update: {}, create: { nome: 'Varejo', cor: '#F87171', organizacaoId: org.id } }),
  ])
  console.log('✅ 6 tags criadas')

  // ─────────────────────────────────────────────────────────────
  // 4. FUNIS & ETAPAS
  // ─────────────────────────────────────────────────────────────
  // Funil de Vendas
  const funil = await prisma.funil.create({
    data: {
      nome: 'Funil de Vendas',
      descricao: 'Pipeline principal de captação e conversão de clientes',
      ordem: 0,
      organizacaoId: org.id,
    },
  })

  const [etNovoLead, etQualificado, etProposta, etNegociacao, etVenda] = await Promise.all([
    prisma.etapaFunil.create({ data: { nome: 'Novo Lead', cor: '#3B82F6', ordem: 0, funilId: funil.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Qualificado', cor: '#F59E0B', ordem: 1, funilId: funil.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Proposta Enviada', cor: '#D4AF37', ordem: 2, funilId: funil.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Negociação', cor: '#CD7F32', ordem: 3, funilId: funil.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Venda Realizada', cor: '#22C55E', ordem: 4, isVendaRealizada: true, funilId: funil.id } }),
  ])

  // Funil de Retenção
  const funilRetencao = await prisma.funil.create({
    data: { nome: 'Retenção', descricao: 'Pipeline de up-sell e retenção de clientes ativos', ordem: 1, organizacaoId: org.id },
  })
  const [etRenovacao, etUpSell, etRenovado] = await Promise.all([
    prisma.etapaFunil.create({ data: { nome: 'Renovação Pendente', cor: '#F59E0B', ordem: 0, funilId: funilRetencao.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Up-sell em Negociação', cor: '#D4AF37', ordem: 1, funilId: funilRetencao.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Renovado', cor: '#22C55E', ordem: 2, isVendaRealizada: true, funilId: funilRetencao.id } }),
  ])
  console.log(`✅ Funis (seção 4): ${funil.nome} · ${funilRetencao.nome}`)

  // ─────────────────────────────────────────────────────────────
  // 5. LEADS — Pipeline ativo + Convertidos
  // ─────────────────────────────────────────────────────────────

  // Leads ativos no pipeline
  const leadAtivo1 = await prisma.lead.create({
    data: { nome: 'Pedro Varejo', email: 'pedro@loja.com', telefone: '5511999990010', empresa: 'Loja do Pedro', etapaId: etNovoLead.id, funilId: funil.id, organizacaoId: org.id },
  })
  const leadAtivo2 = await prisma.lead.create({
    data: { nome: 'Fernanda Tech', email: 'fernanda@ftech.io', telefone: '5511999990011', empresa: 'FTech Solutions', etapaId: etQualificado.id, funilId: funil.id, organizacaoId: org.id },
  })
  const leadAtivo3 = await prisma.lead.create({
    data: { nome: 'Carlos Empresário', email: 'carlos@empresa.com', telefone: '5511999990001', empresa: 'Empresa XYZ Ltda', etapaId: etProposta.id, funilId: funil.id, organizacaoId: org.id },
  })
  const leadAtivo4 = await prisma.lead.create({
    data: { nome: 'Roberta Moda', email: 'roberta@studio.com', telefone: '5511999990012', empresa: 'Studio Moda', etapaId: etNegociacao.id, funilId: funil.id, organizacaoId: org.id },
  })

  // Lead no funil de retenção
  const leadRetencao = await prisma.lead.create({
    data: { nome: 'Lucas Renovação', email: 'lucas@empresa.com', telefone: '5511999990013', empresa: 'Lucas & Cia', etapaId: etRenovacao.id, funilId: funilRetencao.id, organizacaoId: org.id },
  })

  // Leads JÁ CONVERTIDOS (terão projetos + contratos)
  const leadConv1 = await prisma.lead.create({
    data: {
      nome: 'Ana Startup',
      email: 'ana@startup.io',
      telefone: '5511999990002',
      empresa: 'Startup ABC',
      status: 'VENDA_REALIZADA',
      etapaId: etVenda.id,
      funilId: funil.id,
      organizacaoId: org.id,
      vgvTotal: 36000,
      recorrenciaMensal: 3000,
      dataConversao: doisMesesAtras,
    },
  })
  const leadConv2 = await prisma.lead.create({
    data: {
      nome: 'Bruno E-commerce',
      email: 'bruno@loja.net',
      telefone: '5511999990003',
      empresa: 'Loja Online Bruno',
      status: 'VENDA_REALIZADA',
      etapaId: etVenda.id,
      funilId: funil.id,
      organizacaoId: org.id,
      vgvTotal: 8000,
      dataConversao: mesPassado,
    },
  })
  const leadConv3 = await prisma.lead.create({
    data: {
      nome: 'Camila SaaS',
      email: 'camila@saas.com',
      telefone: '5511999990004',
      empresa: 'SaaS Platform',
      status: 'VENDA_REALIZADA',
      etapaId: etVenda.id,
      funilId: funil.id,
      organizacaoId: org.id,
      vgvTotal: 30000,
      recorrenciaMensal: 2500,
      dataConversao: subMonths(hoje, 3),
    },
  })

  // Vincular tags
  await prisma.leadTag.createMany({
    data: [
      { leadId: leadAtivo1.id, tagId: tagVarejo.id },
      { leadId: leadAtivo2.id, tagId: tagStartup.id },
      { leadId: leadAtivo2.id, tagId: tagSaaS.id },
      { leadId: leadAtivo3.id, tagId: tagEcommerce.id },
      { leadId: leadAtivo3.id, tagId: tagPremium.id },
      { leadId: leadAtivo4.id, tagId: tagIndicacao.id },
      { leadId: leadConv1.id, tagId: tagStartup.id },
      { leadId: leadConv1.id, tagId: tagIndicacao.id },
      { leadId: leadConv2.id, tagId: tagEcommerce.id },
      { leadId: leadConv2.id, tagId: tagPremium.id },
      { leadId: leadConv3.id, tagId: tagSaaS.id },
    ],
  })
  console.log(`✅ 7 leads criados (4 ativos, 3 convertidos) com tags`)

  // ─────────────────────────────────────────────────────────────
  // 6. PRESETS DE TAREFAS
  // ─────────────────────────────────────────────────────────────
  const presetSocial = await prisma.presetServico.upsert({
    where: { nome_organizacaoId: { nome: 'Social Media', organizacaoId: org.id } },
    update: {},
    create: {
      nome: 'Social Media',
      organizacaoId: org.id,
      tarefas: {
        create: [
          { titulo: 'Briefing e alinhamento inicial', ordemPadrao: 0 },
          { titulo: 'Criação de calendário editorial mensal', ordemPadrao: 1 },
          { titulo: 'Produção de artes (feed)', ordemPadrao: 2 },
          { titulo: 'Produção de artes (stories)', ordemPadrao: 3 },
          { titulo: 'Produção de reels/vídeos', ordemPadrao: 4 },
          { titulo: 'Agendamento e publicação', ordemPadrao: 5 },
          { titulo: 'Monitoramento e resposta de comentários', ordemPadrao: 6 },
          { titulo: 'Relatório mensal de resultados', ordemPadrao: 7 },
        ],
      },
    },
  })

  const presetTrafego = await prisma.presetServico.upsert({
    where: { nome_organizacaoId: { nome: 'Tráfego Pago', organizacaoId: org.id } },
    update: {},
    create: {
      nome: 'Tráfego Pago',
      organizacaoId: org.id,
      tarefas: {
        create: [
          { titulo: 'Análise de conta e auditoria', ordemPadrao: 0 },
          { titulo: 'Definição de público-alvo e segmentações', ordemPadrao: 1 },
          { titulo: 'Criação de campanhas no Meta Ads', ordemPadrao: 2 },
          { titulo: 'Criação de campanhas no Google Ads', ordemPadrao: 3 },
          { titulo: 'Configuração de conversões e pixels', ordemPadrao: 4 },
          { titulo: 'Relatório semanal de performance', ordemPadrao: 5 },
          { titulo: 'Otimização de lances e segmentações', ordemPadrao: 6 },
        ],
      },
    },
  })

  await prisma.presetServico.upsert({
    where: { nome_organizacaoId: { nome: 'Desenvolvimento de Site', organizacaoId: org.id } },
    update: {},
    create: {
      nome: 'Desenvolvimento de Site',
      organizacaoId: org.id,
      tarefas: {
        create: [
          { titulo: 'Levantamento de requisitos e wireframe', ordemPadrao: 0 },
          { titulo: 'Design de interface (UI/UX)', ordemPadrao: 1 },
          { titulo: 'Desenvolvimento front-end', ordemPadrao: 2 },
          { titulo: 'Integração com CMS/back-end', ordemPadrao: 3 },
          { titulo: 'Testes de responsividade e QA', ordemPadrao: 4 },
          { titulo: 'Publicação e configuração de domínio', ordemPadrao: 5 },
          { titulo: 'Treinamento do cliente', ordemPadrao: 6 },
        ],
      },
    },
  })
  console.log('✅ 3 presets criados (Social Media, Tráfego Pago, Site)')

  // ─────────────────────────────────────────────────────────────
  // 7. PROJETOS (para leads convertidos)
  // ─────────────────────────────────────────────────────────────

  // Projeto 1: Startup ABC — Social Media (recorrente, 2 meses)
  const projeto1 = await prisma.projeto.create({
    data: {
      nome: 'Startup ABC — Social Media',
      tipoServico: 'Social Media',
      status: 'ATIVO',
      leadId: leadConv1.id,
      organizacaoId: org.id,
    },
  })

  const sprint1 = await prisma.sprint.create({
    data: {
      nome: 'Sprint 1 — Onboarding',
      dataInicio: doisMesesAtras,
      dataFim: subDays(mesPassado, 1),
      projetoId: projeto1.id,
      organizacaoId: org.id,
    },
  })
  const sprint2 = await prisma.sprint.create({
    data: {
      nome: 'Sprint 2 — Execução',
      dataInicio: mesPassado,
      dataFim: addDays(hoje, 14),
      projetoId: projeto1.id,
      organizacaoId: org.id,
    },
  })

  const [t1a, t1b, t1c, t1d, t1e, t1f] = await Promise.all([
    prisma.tarefa.create({ data: { titulo: 'Briefing e alinhamento inicial', status: 'CONCLUIDA', ordem: 0, projetoId: projeto1.id, sprintId: sprint1.id, responsavelId: gestor.id, organizacaoId: org.id, prazo: addDays(doisMesesAtras, 3) } }),
    prisma.tarefa.create({ data: { titulo: 'Criação de calendário editorial', status: 'CONCLUIDA', ordem: 1, projetoId: projeto1.id, sprintId: sprint1.id, responsavelId: operacional.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Produção de artes (feed)', status: 'CONCLUIDA', ordem: 2, projetoId: projeto1.id, sprintId: sprint1.id, responsavelId: operacional.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Produção de reels/vídeos', status: 'EM_ANDAMENTO', ordem: 3, projetoId: projeto1.id, sprintId: sprint2.id, responsavelId: operacional.id, organizacaoId: org.id, prazo: addDays(hoje, 5) } }),
    prisma.tarefa.create({ data: { titulo: 'Agendamento e publicação', status: 'PENDENTE', ordem: 4, projetoId: projeto1.id, sprintId: sprint2.id, responsavelId: operacional.id, organizacaoId: org.id, prazo: addDays(hoje, 10) } }),
    prisma.tarefa.create({ data: { titulo: 'Relatório mensal de resultados', status: 'PENDENTE', ordem: 5, projetoId: projeto1.id, sprintId: sprint2.id, organizacaoId: org.id, prazo: addDays(hoje, 14) } }),
  ])

  // Detalhamentos
  await prisma.detalhamento.create({
    data: { conteudo: 'Reunião de kickoff realizada. Cliente aprovou o calendário editorial com foco em conteúdo educativo e bastidores da empresa.', tarefaId: t1a.id, autorId: gestor.id },
  })
  await prisma.detalhamento.create({
    data: { conteudo: 'Calendário criado com 20 posts para o mês. Aprovado pelo cliente via e-mail.', tarefaId: t1b.id, autorId: operacional.id },
  })
  await prisma.detalhamento.create({
    data: { conteudo: 'Precisamos gravar 3 reels esta semana. Cliente enviou os vídeos brutos para edição.', tarefaId: t1d.id, autorId: operacional.id },
  })

  // Projeto 2: Loja Online Bruno — Site (parcelado, já entregue)
  const projeto2 = await prisma.projeto.create({
    data: {
      nome: 'Loja Online Bruno — Site',
      tipoServico: 'Desenvolvimento de Site',
      status: 'CONCLUIDO',
      leadId: leadConv2.id,
      organizacaoId: org.id,
    },
  })

  await Promise.all([
    prisma.tarefa.create({ data: { titulo: 'Levantamento de requisitos e wireframe', status: 'CONCLUIDA', ordem: 0, projetoId: projeto2.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Design de interface (UI/UX)', status: 'CONCLUIDA', ordem: 1, projetoId: projeto2.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Desenvolvimento front-end', status: 'CONCLUIDA', ordem: 2, projetoId: projeto2.id, responsavelId: gestor.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Integração com CMS', status: 'CONCLUIDA', ordem: 3, projetoId: projeto2.id, responsavelId: gestor.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Publicação e configuração de domínio', status: 'CONCLUIDA', ordem: 4, projetoId: projeto2.id, organizacaoId: org.id } }),
  ])

  // Projeto 3: SaaS Platform — Tráfego Pago (recorrente, 3 meses)
  const projeto3 = await prisma.projeto.create({
    data: {
      nome: 'SaaS Platform — Tráfego Pago',
      tipoServico: 'Tráfego Pago',
      status: 'ATIVO',
      leadId: leadConv3.id,
      organizacaoId: org.id,
    },
  })

  const sprint3 = await prisma.sprint.create({
    data: {
      nome: 'Q1 2026',
      dataInicio: subMonths(hoje, 3),
      dataFim: addDays(hoje, 7),
      projetoId: projeto3.id,
      organizacaoId: org.id,
    },
  })
  await Promise.all([
    prisma.tarefa.create({ data: { titulo: 'Análise de conta e auditoria', status: 'CONCLUIDA', ordem: 0, projetoId: projeto3.id, sprintId: sprint3.id, responsavelId: gestor.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Criação de campanhas Meta Ads', status: 'CONCLUIDA', ordem: 1, projetoId: projeto3.id, sprintId: sprint3.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Criação de campanhas Google Ads', status: 'CONCLUIDA', ordem: 2, projetoId: projeto3.id, sprintId: sprint3.id, organizacaoId: org.id } }),
    prisma.tarefa.create({ data: { titulo: 'Otimização de lances Q1', status: 'EM_ANDAMENTO', ordem: 3, projetoId: projeto3.id, sprintId: sprint3.id, responsavelId: gestor.id, organizacaoId: org.id, prazo: addDays(hoje, 7) } }),
    prisma.tarefa.create({ data: { titulo: 'Relatório de performance Q1', status: 'PENDENTE', ordem: 4, projetoId: projeto3.id, sprintId: sprint3.id, organizacaoId: org.id, prazo: addDays(hoje, 7) } }),
  ])

  console.log('✅ 3 projetos criados com sprints, tarefas e detalhamentos')

  // ─────────────────────────────────────────────────────────────
  // 8. CONTRATOS E LANÇAMENTOS FINANCEIROS
  // ─────────────────────────────────────────────────────────────

  // Contrato 1: Startup ABC — Recorrente R$3.000/mês
  const contrato1 = await prisma.contratoFinanceiro.create({
    data: {
      valorTotal: 36000,
      recorrenciaMensal: 3000,
      tipoPagamento: 'RECORRENTE',
      dataInicio: doisMesesAtras,
      projetoId: projeto1.id,
      leadId: leadConv1.id,
      organizacaoId: org.id,
    },
  })

  // Lançamentos: mês -2 (PAGO), mês -1 (PAGO), mês atual (PENDENTE), próximos 9 meses (PENDENTE)
  const lancamentos1 = []
  for (let i = 0; i < 12; i++) {
    const venc = addMonths(doisMesesAtras, i)
    const isPago = i < 2
    const isAtrasado = i === 2 && hoje > venc
    lancamentos1.push({
      descricao: `Mensalidade Social Media — ${venc.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      valor: 3000,
      dataVencimento: venc,
      dataPagamento: isPago ? addDays(venc, 2) : null,
      valorPago: isPago ? 3000 : null,
      status: isPago ? ('PAGO' as const) : (isAtrasado ? ('ATRASADO' as const) : ('PENDENTE' as const)),
      tipo: 'RECORRENTE' as const,
      contratoId: contrato1.id,
      organizacaoId: org.id,
    })
  }
  await prisma.lancamento.createMany({ data: lancamentos1 })

  // Contrato 2: Loja Online Bruno — Parcelado 4x R$2.000
  const contrato2 = await prisma.contratoFinanceiro.create({
    data: {
      valorTotal: 8000,
      tipoPagamento: 'PARCELADO',
      dataInicio: mesPassado,
      numeroParcelas: 4,
      projetoId: projeto2.id,
      leadId: leadConv2.id,
      organizacaoId: org.id,
    },
  })

  const lancamentos2 = []
  for (let i = 0; i < 4; i++) {
    const venc = addMonths(mesPassado, i)
    const isPago = i < 2
    lancamentos2.push({
      descricao: `Parcela ${i + 1}/4 — Site Loja Online`,
      valor: 2000,
      dataVencimento: venc,
      dataPagamento: isPago ? addDays(venc, 1) : null,
      valorPago: isPago ? 2000 : null,
      status: isPago ? ('PAGO' as const) : ('PENDENTE' as const),
      tipo: 'UNICO' as const,
      contratoId: contrato2.id,
      organizacaoId: org.id,
    })
  }
  await prisma.lancamento.createMany({ data: lancamentos2 })

  // Contrato 3: SaaS Platform — Recorrente R$2.500/mês
  const contrato3 = await prisma.contratoFinanceiro.create({
    data: {
      valorTotal: 30000,
      recorrenciaMensal: 2500,
      tipoPagamento: 'RECORRENTE',
      dataInicio: subMonths(hoje, 3),
      projetoId: projeto3.id,
      leadId: leadConv3.id,
      organizacaoId: org.id,
    },
  })

  const lancamentos3 = []
  for (let i = 0; i < 12; i++) {
    const venc = addMonths(subMonths(hoje, 3), i)
    const isPago = i < 3
    lancamentos3.push({
      descricao: `Mensalidade Tráfego Pago — ${venc.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      valor: 2500,
      dataVencimento: venc,
      dataPagamento: isPago ? addDays(venc, 3) : null,
      valorPago: isPago ? 2500 : null,
      status: isPago ? ('PAGO' as const) : ('PENDENTE' as const),
      tipo: 'RECORRENTE' as const,
      contratoId: contrato3.id,
      organizacaoId: org.id,
    })
  }
  await prisma.lancamento.createMany({ data: lancamentos3 })

  console.log('✅ 3 contratos + 28 lançamentos financeiros criados')

  // ─────────────────────────────────────────────────────────────
  // 9. MENSAGENS WHATSAPP
  // ─────────────────────────────────────────────────────────────
  const mensagens = [
    // Conversa com Ana Startup (leadConv1)
    { corpo: 'Olá! Vi os resultados do mês, ficou ótimo!', fromMe: false, timestamp: subDays(hoje, 5), whatsappId: 'wa-001', telefoneContato: '5511999990002', lida: true, leadId: leadConv1.id, organizacaoId: org.id },
    { corpo: 'Que bom! Estamos muito felizes com o crescimento do engajamento 🎯', fromMe: true, timestamp: subDays(hoje, 5), whatsappId: 'wa-002', telefoneContato: '5511999990002', lida: true, leadId: leadConv1.id, organizacaoId: org.id },
    { corpo: 'Preciso de mais reels esse mês, podemos incluir?', fromMe: false, timestamp: subDays(hoje, 2), whatsappId: 'wa-003', telefoneContato: '5511999990002', lida: true, leadId: leadConv1.id, organizacaoId: org.id },
    { corpo: 'Com certeza! Vou atualizar o escopo no projeto.', fromMe: true, timestamp: subDays(hoje, 2), whatsappId: 'wa-004', telefoneContato: '5511999990002', lida: true, leadId: leadConv1.id, organizacaoId: org.id },
    { corpo: 'Quando vocês enviam o relatório do mês?', fromMe: false, timestamp: subDays(hoje, 1), whatsappId: 'wa-005', telefoneContato: '5511999990002', lida: false, leadId: leadConv1.id, organizacaoId: org.id },

    // Conversa com Carlos Empresário (leadAtivo3 — em proposta)
    { corpo: 'Bom dia! Recebi a proposta, vou analisar essa semana.', fromMe: false, timestamp: subDays(hoje, 3), whatsappId: 'wa-006', telefoneContato: '5511999990001', lida: true, leadId: leadAtivo3.id, organizacaoId: org.id },
    { corpo: 'Perfeito Carlos! Qualquer dúvida estou à disposição.', fromMe: true, timestamp: subDays(hoje, 3), whatsappId: 'wa-007', telefoneContato: '5511999990001', lida: true, leadId: leadAtivo3.id, organizacaoId: org.id },
    { corpo: 'Tenho uma dúvida sobre o prazo de entrega, podemos conversar?', fromMe: false, timestamp: hoje, whatsappId: 'wa-008', telefoneContato: '5511999990001', lida: false, leadId: leadAtivo3.id, organizacaoId: org.id },

    // Contato não identificado
    { corpo: 'Oi, vi vocês no Instagram, como funciona o serviço?', fromMe: false, timestamp: subDays(hoje, 1), whatsappId: 'wa-009', telefoneContato: '5511999990099', lida: false, leadId: null, organizacaoId: org.id },
  ]

  await prisma.mensagem.createMany({ data: mensagens })
  console.log(`✅ ${mensagens.length} mensagens WhatsApp criadas (1 contato não identificado)`)

  // ─────────────────────────────────────────────────────────────
  // 10. SQUAD & AGENTES & EXECUÇÕES
  // ─────────────────────────────────────────────────────────────
  const squad = await prisma.squad.create({
    data: {
      nome: 'Core Agency Squad',
      descricao: 'Equipe de IA principal para automação de tarefas da agência',
      avatar: '🚀',
      cor: '#D4AF37',
      organizacaoId: org.id,
      agentes: {
        create: [
          {
            nome: 'Copywriter IA',
            role: 'copywriter',
            icone: '✍️',
            descricao: 'Cria textos persuasivos para campanhas e redes sociais',
            status: 'DISPONIVEL',
            configuracao: { modelo: 'claude-sonnet-4-6', temperatura: 0.7, maxTokens: 2000 },
            organizacaoId: org.id,
          },
          {
            nome: 'Analista de Dados',
            role: 'analyst',
            icone: '📊',
            descricao: 'Analisa métricas, gera insights e relatórios de performance',
            status: 'DISPONIVEL',
            configuracao: { modelo: 'claude-sonnet-4-6', temperatura: 0.3, maxTokens: 4000 },
            organizacaoId: org.id,
          },
          {
            nome: 'Gestor de Tráfego IA',
            role: 'traffic-manager',
            icone: '📈',
            descricao: 'Otimiza campanhas de tráfego pago com base em dados',
            status: 'DISPONIVEL',
            configuracao: { modelo: 'claude-sonnet-4-6', temperatura: 0.5, maxTokens: 3000 },
            organizacaoId: org.id,
          },
        ],
      },
    },
    include: { agentes: true },
  })

  const [agenteCopy, agenteAnalista, agenteTrafego] = squad.agentes

  // Criar histórico de execuções
  const exec1 = await prisma.execucao.create({
    data: {
      comando: 'Gerar 5 legendas para posts de Social Media sobre produtividade',
      status: 'CONCLUIDA',
      iniciadoEm: subDays(hoje, 3),
      concluidoEm: addDays(subDays(hoje, 3), 0),
      duracaoMs: 12400,
      output: '1. "Pequenas ações diárias constroem grandes resultados. 💪 #Produtividade"\n2. "Foco é a ponte entre onde você está e onde quer chegar. 🎯"\n3. "Cada tarefa concluída é um passo mais perto do seu objetivo. ✅"\n4. "Organize sua rotina, transforme seus resultados. 📋"\n5. "O segredo da produtividade? Começar. Agora. 🚀"',
      agenteId: agenteCopy.id,
      usuarioId: admin.id,
      organizacaoId: org.id,
    },
  })

  await prisma.logExecucao.createMany({
    data: [
      { execucaoId: exec1.id, nivel: 'INFO', mensagem: 'Iniciando geração de legendas...', timestamp: subDays(hoje, 3) },
      { execucaoId: exec1.id, nivel: 'INFO', mensagem: 'Analisando contexto e tema: produtividade', timestamp: subDays(hoje, 3) },
      { execucaoId: exec1.id, nivel: 'SUCCESS', mensagem: '5 legendas geradas com sucesso', timestamp: subDays(hoje, 3) },
    ],
  })

  const exec2 = await prisma.execucao.create({
    data: {
      comando: 'Analisar métricas de engajamento da Startup ABC no último mês',
      status: 'CONCLUIDA',
      iniciadoEm: subDays(hoje, 1),
      concluidoEm: subDays(hoje, 1),
      duracaoMs: 8200,
      output: 'Análise concluída: Taxa de engajamento média de 4,2% (acima da média do setor de 2,1%). Reels com maior alcance: vídeo de bastidores com 12k visualizações. Recomendação: aumentar frequência de reels para 3x/semana.',
      agenteId: agenteAnalista.id,
      usuarioId: gestor.id,
      organizacaoId: org.id,
    },
  })

  await prisma.logExecucao.createMany({
    data: [
      { execucaoId: exec2.id, nivel: 'INFO', mensagem: 'Iniciando análise de métricas...', timestamp: subDays(hoje, 1) },
      { execucaoId: exec2.id, nivel: 'INFO', mensagem: 'Processando dados de engajamento', timestamp: subDays(hoje, 1) },
      { execucaoId: exec2.id, nivel: 'WARN', mensagem: 'Stories com baixo engajamento detectados', timestamp: subDays(hoje, 1) },
      { execucaoId: exec2.id, nivel: 'SUCCESS', mensagem: 'Relatório de análise gerado', timestamp: subDays(hoje, 1) },
    ],
  })

  const exec3 = await prisma.execucao.create({
    data: {
      comando: 'Verificar performance das campanhas Google Ads — SaaS Platform',
      status: 'FALHA',
      iniciadoEm: hoje,
      concluidoEm: hoje,
      output: 'Erro: Credenciais da conta Google Ads não configuradas. Configure GOOGLE_ADS_API_KEY no painel de integrações.',
      agenteId: agenteTrafego.id,
      usuarioId: gestor.id,
      organizacaoId: org.id,
    },
  })

  await prisma.logExecucao.createMany({
    data: [
      { execucaoId: exec3.id, nivel: 'INFO', mensagem: 'Conectando à API do Google Ads...', timestamp: hoje },
      { execucaoId: exec3.id, nivel: 'ERROR', mensagem: 'Falha na autenticação: credenciais inválidas ou não configuradas', timestamp: hoje },
    ],
  })

  console.log(`✅ Squad "${squad.nome}" com 3 agentes e 3 execuções (histórico) criado`)

  // ─────────────────────────────────────────────────────────────
  // 11. FOTO IA — Funil + Squad + Pedidos de Exemplo
  // ─────────────────────────────────────────────────────────────

  // Funil FotoIA com 11 etapas
  const funilFotoIA = await prisma.funil.create({
    data: {
      nome: 'FotoIA — Entrega',
      descricao: 'Pipeline automatizado de vendas e entrega de fotos profissionais por IA',
      ordem: 2,
      organizacaoId: org.id,
    },
  })

  const [
    ftNovoLead, ftQualificacao, ftProposta, ftFollowup1, ftFollowup2,
    ftAguardandoPgto, ftPgtConfirmado, ftEmProducao, ftAguardandoAprovacao,
    ftEmRevisao, ftEntregue,
  ] = await Promise.all([
    prisma.etapaFunil.create({ data: { nome: 'Novo Lead', cor: '#3B82F6', ordem: 0, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Em Qualificação', cor: '#8B5CF6', ordem: 1, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Proposta Enviada', cor: '#F59E0B', ordem: 2, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Follow-up 1', cor: '#F97316', ordem: 3, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Follow-up 2', cor: '#EF4444', ordem: 4, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Aguardando Pagamento', cor: '#D4AF37', ordem: 5, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Pagamento Confirmado', cor: '#10B981', ordem: 6, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Em Produção', cor: '#06B6D4', ordem: 7, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Aguardando Aprovação', cor: '#A78BFA', ordem: 8, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Em Revisão', cor: '#F59E0B', ordem: 9, funilId: funilFotoIA.id } }),
    prisma.etapaFunil.create({ data: { nome: 'Entregue', cor: '#22C55E', ordem: 10, isVendaRealizada: true, funilId: funilFotoIA.id } }),
  ])
  console.log(`✅ Funil ${funilFotoIA.nome} com 11 etapas criado`)

  // Squad FotoIA no banco (Squad IA registry)
  const squadFotoIA = await prisma.squad.create({
    data: {
      nome: 'FotoIA Squad',
      descricao: 'Squad automatizado de vendas e produção de fotos profissionais por IA',
      avatar: '📸',
      cor: '#A78BFA',
      ativo: true,
      organizacaoId: org.id,
      agentes: {
        create: [
          { nome: 'Vendedor IA', role: 'vendedor-ia', icone: '🤝', descricao: 'Conduz vendas via WhatsApp do primeiro contato até aceite', status: 'DISPONIVEL', configuracao: { modelo: 'claude-sonnet-4-6', temperatura: 0.7, maxTokens: 500 }, organizacaoId: org.id },
          { nome: 'Cobrador IA', role: 'cobrador-ia', icone: '💳', descricao: 'Processa pagamentos e monitora confirmações via gateway', status: 'DISPONIVEL', configuracao: { gateway: 'asaas', timeoutHoras: 48 }, organizacaoId: org.id },
          { nome: 'Produtor IA', role: 'produtor-ia', icone: '🎨', descricao: 'Gera imagens profissionais via Replicate/DALL-E', status: 'DISPONIVEL', configuracao: { modelo: 'stability-ai/sdxl', qualidade: 'high', formato: 'jpeg' }, organizacaoId: org.id },
          { nome: 'Entregador IA', role: 'entregador-ia', icone: '📦', descricao: 'Envia galeria ao cliente, coleta aprovação e confirma entrega', status: 'DISPONIVEL', configuracao: { tokenExpiryHoras: 72, maxRevisoes: 2 }, organizacaoId: org.id },
        ],
      },
    },
    include: { agentes: true },
  })

  // Leads de exemplo no pipeline FotoIA
  const leadFoto1 = await prisma.lead.create({
    data: { nome: 'Daniela Advogada', email: 'daniela@advocacia.com', telefone: '5511988880001', empresa: 'Advocacia Daniela Lima', etapaId: ftEntregue.id, funilId: funilFotoIA.id, organizacaoId: org.id, status: 'VENDA_REALIZADA', dataConversao: subDays(hoje, 2) },
  })
  const leadFoto2 = await prisma.lead.create({
    data: { nome: 'Rafael E-commerce', email: 'rafael@lojinha.com', telefone: '5511988880002', empresa: 'Lojinha do Rafael', etapaId: ftAguardandoAprovacao.id, funilId: funilFotoIA.id, organizacaoId: org.id },
  })
  const leadFoto3 = await prisma.lead.create({
    data: { nome: 'Mariana Consultora', email: 'mariana@consultoria.com', telefone: '5511988880003', empresa: null, etapaId: ftProposta.id, funilId: funilFotoIA.id, organizacaoId: org.id },
  })
  const leadFoto4 = await prisma.lead.create({
    data: { nome: 'Tiago Empresário', email: 'tiago@negocio.com', telefone: '5511988880004', empresa: 'Negócios Tiago', etapaId: ftAguardandoPgto.id, funilId: funilFotoIA.id, organizacaoId: org.id },
  })

  // Pedidos FotoIA de exemplo
  const pedido1 = await prisma.pedidoFotoIA.create({
    data: {
      leadId: leadFoto1.id,
      organizacaoId: org.id,
      status: 'ENTREGUE',
      tipoFoto: 'RETRATO_PROFISSIONAL',
      descricao: 'Foto profissional para LinkedIn e site do escritório. Fundo neutro cinza.',
      valorCobrado: 97,
      cobrancaId: 'asaas-cob-001',
      rodadasRevisao: 1,
      aprovadoEm: subDays(hoje, 1),
      entregueEm: subDays(hoje, 1),
      imagens: {
        create: [
          { url: '/uploads/foto-ia/daniela-1.jpg', tipo: 'entregue', rodada: 2, aprovada: true },
          { url: '/uploads/foto-ia/daniela-2.jpg', tipo: 'entregue', rodada: 2, aprovada: true },
          { url: '/uploads/foto-ia/daniela-3.jpg', tipo: 'entregue', rodada: 2, aprovada: true },
          { url: '/uploads/foto-ia/daniela-4.jpg', tipo: 'entregue', rodada: 2, aprovada: true },
          { url: '/uploads/foto-ia/daniela-5.jpg', tipo: 'entregue', rodada: 2, aprovada: true },
        ],
      },
    },
  })

  const pedido2 = await prisma.pedidoFotoIA.create({
    data: {
      leadId: leadFoto2.id,
      organizacaoId: org.id,
      status: 'AGUARDANDO_APROVACAO',
      tipoFoto: 'FOTO_PRODUTO',
      descricao: 'Fotos de produtos para e-commerce — fundo branco, iluminação de estúdio',
      valorCobrado: 147,
      cobrancaId: 'asaas-cob-002',
      rodadasRevisao: 0,
      imagens: {
        create: [
          { url: '/uploads/foto-ia/rafael-prod-1.jpg', tipo: 'gerada', rodada: 1, aprovada: false },
          { url: '/uploads/foto-ia/rafael-prod-2.jpg', tipo: 'gerada', rodada: 1, aprovada: false },
          { url: '/uploads/foto-ia/rafael-prod-3.jpg', tipo: 'gerada', rodada: 1, aprovada: false },
          { url: '/uploads/foto-ia/rafael-prod-4.jpg', tipo: 'gerada', rodada: 1, aprovada: false },
          { url: '/uploads/foto-ia/rafael-prod-5.jpg', tipo: 'gerada', rodada: 1, aprovada: false },
        ],
      },
    },
  })

  const pedido3 = await prisma.pedidoFotoIA.create({
    data: {
      leadId: leadFoto3.id,
      organizacaoId: org.id,
      status: 'PROPOSTA_ENVIADA',
      tipoFoto: 'FOTO_PERFIL',
      descricao: 'Foto de perfil profissional para LinkedIn',
      rodadasRevisao: 0,
    },
  })

  const pedido4 = await prisma.pedidoFotoIA.create({
    data: {
      leadId: leadFoto4.id,
      organizacaoId: org.id,
      status: 'AGUARDANDO_PAGAMENTO',
      tipoFoto: 'FOTO_CORPORATIVA',
      descricao: 'Fotos corporativas para equipe de 8 pessoas',
      valorCobrado: 197,
      linkPagamento: 'https://pay.asaas.com/exemplo-link-demo',
      rodadasRevisao: 0,
    },
  })

  console.log(`✅ Squad FotoIA com 4 agentes e 4 pedidos de exemplo criados`)

  // ─────────────────────────────────────────────────────────────
  // 12. FOTO IA — Configurações padrão (preços, prompts, templates)
  // ─────────────────────────────────────────────────────────────
  await prisma.fotoIAConfig.upsert({
    where: { organizacaoId: org.id },
    update: {},
    create: {
      organizacaoId: org.id,
      precos: {
        BASICO:       { preco: 27,  qtdImagens: 5,  revisoes: 1,  ativo: true },
        PROFISSIONAL: { preco: 47,  qtdImagens: 10, revisoes: 4,  ativo: true },
        PREMIUM:      { preco: 97,  qtdImagens: 30, revisoes: 10, ativo: true },
      },
      prompts: {
        RETRATO_PROFISSIONAL: {
          base: 'Professional portrait photo, sharp focus, professional studio lighting, high resolution, business attire, neutral grey background, photorealistic',
          negativo: 'blurry, low quality, distorted face, cartoon, anime, painting, watermark',
        },
        FOTO_PRODUTO: {
          base: 'Professional product photography, pure white background, studio lighting, sharp details, commercial quality',
          negativo: 'blurry, shadows, reflections, distracting backgrounds, watermarks',
        },
        FOTO_CORPORATIVA: {
          base: 'Corporate professional photo, modern office environment, formal business attire, confident expression, clean background',
          negativo: 'casual clothes, unprofessional setting, blurry, dark lighting',
        },
        BANNER_REDES_SOCIAIS: {
          base: 'Professional social media banner, vibrant colors, modern design, marketing aesthetic, high resolution',
          negativo: 'amateur design, low quality, pixelated, cluttered',
        },
        FOTO_PERFIL: {
          base: 'Professional LinkedIn profile photo, clean light background, natural soft lighting, friendly confident expression, upper body portrait',
          negativo: 'full body shot, group photo, blurry, dark background, sunglasses',
        },
        CUSTOM: {
          base: 'Professional high-quality photo, sharp details, excellent lighting',
          negativo: 'blurry, low quality, distorted',
        },
      },
      templates: {
        saudacao: 'Olá {nome}! 👋\n\nSeja bem-vindo(a) ao *FotoIA* — fotos profissionais por IA! 📸\n\n🥉 *Básico* — R$ 27 → 5 fotos + 1 revisão\n⭐ *Profissional* — R$ 47 → 10 fotos + 4 revisões\n👑 *Premium* — R$ 97 → 30 fotos + 10 revisões\n\nQual pacote você prefere?',
        cobranca: 'Perfeito, {nome}! 🎉\n\nPacote *{pacote}*:\n✅ {qtdFotos} fotos · {revisoes} revisões · R$ {valor}\n\nPIX {tipoPix}: *{chavePix}*\nBeneficiário: {nomeBeneficiario}\n\nEnvie o comprovante aqui! 📩',
        coletarTema: 'Pagamento confirmado, {nome}! ✅\n\nQual será o *tema* das suas fotos?\n\nEx: "LinkedIn corporativo", "ao ar livre casual"...',
        coletarFoto: 'Perfeito! Agora envie *uma foto do seu rosto* 📷\n\nUse boa iluminação e evite filtros. Tema: *{tema}*',
        emProducao: 'Oi {nome}! 🎨 Suas fotos estão sendo geradas agora!\n\nEm breve você receberá a galeria. Aguarde! ⏳',
        entrega: '{nome}, suas fotos ficaram incríveis! 🤩\n\nAcesse sua galeria:\n👉 {link}\n_(válido por 7 dias)_',
        followup1: 'Oi {nome}! 👋 Vi que ainda não escolheu seu pacote de fotos profissionais.\n\nTem alguma dúvida?',
        followup2: '{nome}, última chance! ⏰ Vagas preenchendo. Garanta agora! 📸',
      },
      replicateModel: 'tencentarc/photomaker-style:ddfc2b08d209f9fa8c1eca692712918bd449f695d786de39a1d4f0c4cbed1433',
      gatewayProvider: 'pix_manual',
      storageProvider: 'local',
    },
  })
  console.log('✅ FotoIAConfig: preços, prompts e templates padrão criados')

  // ─────────────────────────────────────────────────────────────
  // RESUMO FINAL
  // ─────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed completo finalizado com sucesso!\n')
  console.log('📊 Dados criados:')
  console.log('   • 1 organização, 3 usuários')
  console.log('   • 6 tags, 3 funis (Principal + Retenção + FotoIA)')
  console.log('   • 11 leads (4 ativos, 3 convertidos, 4 no pipeline FotoIA)')
  console.log('   • 3 presets de tarefas')
  console.log('   • 3 projetos com sprints, tarefas e detalhamentos')
  console.log('   • 3 contratos + 28 lançamentos financeiros')
  console.log('   • 9 mensagens WhatsApp (1 contato não identificado)')
  console.log('   • 2 squads IA (Conteúdo + FotoIA), 7 agentes, 3 execuções com logs')
  console.log('   • 4 pedidos FotoIA com imagens de exemplo')
  console.log('   • FotoIAConfig com preços, prompts e templates padrão')
  console.log('\n🔑 Credenciais:')
  console.log('   Admin:       admin@agencia.com / senha123')
  console.log('   Gestor:      gestor@agencia.com / senha123')
  console.log('   Operacional: operacao@agencia.com / senha123')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
