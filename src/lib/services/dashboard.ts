import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export interface DashboardKpis {
  vgvTotal: number
  mrr: number
  leadsAtivos: number
  tarefasHoje: number
  leadsNovasSemana: number
}

export interface AtividadeItem {
  id: string
  tipo: 'lead_criado' | 'venda_realizada' | 'tarefa_concluida' | 'projeto_criado'
  descricao: string
  createdAt: Date
}

export async function getKpis(
  organizacaoId: string,
  usuarioId: string
): Promise<DashboardKpis> {
  const hoje = new Date()

  const [leadsVendidos, leadsAtivos, tarefasHoje, leadsNovasSemana] = await Promise.all([
    // VGV Total + MRR — leads com venda realizada
    prisma.lead.findMany({
      where: { organizacaoId, status: 'VENDA_REALIZADA' },
      select: { vgvTotal: true, recorrenciaMensal: true },
    }),

    // Leads ativos
    prisma.lead.count({
      where: { organizacaoId, status: 'ATIVO' },
    }),

    // Tarefas do dia (responsável = usuário logado)
    prisma.tarefa.count({
      where: {
        organizacaoId,
        responsavelId: usuarioId,
        prazo: {
          gte: startOfDay(hoje),
          lte: endOfDay(hoje),
        },
        status: { not: 'CONCLUIDA' },
      },
    }),

    // Novos leads na última semana
    prisma.lead.count({
      where: {
        organizacaoId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ])

  const vgvTotal = leadsVendidos.reduce(
    (sum, l) => sum + (l.vgvTotal ? Number(l.vgvTotal) : 0),
    0
  )

  const mrr = leadsVendidos.reduce(
    (sum, l) => sum + (l.recorrenciaMensal ? Number(l.recorrenciaMensal) : 0),
    0
  )

  return {
    vgvTotal,
    mrr,
    leadsAtivos,
    tarefasHoje,
    leadsNovasSemana,
  }
}

export async function getAtividadeRecente(
  organizacaoId: string
): Promise<AtividadeItem[]> {
  const [leadsRecentes, vendasRecentes, tarefasConcluidas] = await Promise.all([
    prisma.lead.findMany({
      where: { organizacaoId, status: 'ATIVO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, nome: true, empresa: true, createdAt: true },
    }),
    prisma.lead.findMany({
      where: { organizacaoId, status: 'VENDA_REALIZADA' },
      orderBy: { dataConversao: 'desc' },
      take: 5,
      select: { id: true, nome: true, empresa: true, dataConversao: true },
    }),
    prisma.tarefa.findMany({
      where: { organizacaoId, status: 'CONCLUIDA' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, titulo: true, updatedAt: true },
    }),
  ])

  const atividades: AtividadeItem[] = [
    ...leadsRecentes.map((l) => ({
      id: `lead-${l.id}`,
      tipo: 'lead_criado' as const,
      descricao: `Novo lead: ${l.nome}${l.empresa ? ` (${l.empresa})` : ''}`,
      createdAt: l.createdAt,
    })),
    ...vendasRecentes
      .filter((v) => v.dataConversao)
      .map((v) => ({
        id: `venda-${v.id}`,
        tipo: 'venda_realizada' as const,
        descricao: `Venda realizada: ${v.nome}${v.empresa ? ` (${v.empresa})` : ''}`,
        createdAt: v.dataConversao!,
      })),
    ...tarefasConcluidas.map((t) => ({
      id: `tarefa-${t.id}`,
      tipo: 'tarefa_concluida' as const,
      descricao: `Tarefa concluída: ${t.titulo}`,
      createdAt: t.updatedAt,
    })),
  ]

  return atividades.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10)
}
