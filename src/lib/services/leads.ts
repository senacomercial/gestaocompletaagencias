import { prisma } from '@/lib/prisma'
import type { CreateLeadInput, UpdateLeadInput } from '@/lib/validators/lead'
import type { FunilComEtapas } from '@/types'

export async function getKanbanData(organizacaoId: string, funilId: string): Promise<FunilComEtapas | null> {
  const funil = await prisma.funil.findFirst({
    where: { id: funilId, organizacaoId },
    include: {
      etapas: {
        orderBy: { ordem: 'asc' },
        include: {
          leads: {
            where: { status: 'ATIVO', organizacaoId },
            orderBy: { createdAt: 'desc' },
            include: { tags: { include: { tag: true } } },
          },
        },
      },
    },
  })
  if (!funil) return null

  return {
    id: funil.id,
    nome: funil.nome,
    descricao: funil.descricao,
    ordem: funil.ordem,
    etapas: funil.etapas.map((etapa) => ({
      id: etapa.id,
      nome: etapa.nome,
      cor: etapa.cor,
      isVendaRealizada: etapa.isVendaRealizada,
      ordem: etapa.ordem,
      leads: etapa.leads.map((lead) => ({
        id: lead.id,
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        empresa: lead.empresa,
        status: lead.status,
        vgvTotal: lead.vgvTotal ? lead.vgvTotal.toString() : null,
        recorrenciaMensal: lead.recorrenciaMensal ? lead.recorrenciaMensal.toString() : null,
        dataConversao: lead.dataConversao,
        etapaId: lead.etapaId,
        funilId: lead.funilId,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        etapa: {
          id: etapa.id,
          nome: etapa.nome,
          cor: etapa.cor,
          isVendaRealizada: etapa.isVendaRealizada,
        },
        tags: lead.tags.map((lt) => ({ tag: lt.tag })),
      })),
    })),
  }
}

export async function getLead(id: string, organizacaoId: string) {
  return prisma.lead.findFirst({
    where: { id, organizacaoId },
    include: {
      etapa: true,
      funil: { select: { id: true, nome: true } },
      tags: { include: { tag: true } },
    },
  })
}

export async function getLeads(organizacaoId: string, funilId?: string) {
  return prisma.lead.findMany({
    where: { organizacaoId, ...(funilId && { funilId }) },
    orderBy: { createdAt: 'desc' },
    include: {
      etapa: true,
      tags: { include: { tag: true } },
    },
  })
}

export async function createLead(data: CreateLeadInput, organizacaoId: string) {
  // Valida que etapa pertence ao funil e à organização
  const etapa = await prisma.etapaFunil.findFirst({
    where: { id: data.etapaId, funilId: data.funilId },
  })
  if (!etapa) throw new Error('Etapa não encontrada no funil')

  return prisma.lead.create({
    data: { ...data, organizacaoId },
    include: { etapa: true, tags: { include: { tag: true } } },
  })
}

export async function updateLead(id: string, data: UpdateLeadInput, organizacaoId: string) {
  return prisma.lead.update({
    where: { id, organizacaoId },
    data,
    include: { etapa: true, tags: { include: { tag: true } } },
  })
}

export async function deleteLead(id: string, organizacaoId: string) {
  return prisma.lead.delete({ where: { id, organizacaoId } })
}

export async function moverEtapa(leadId: string, etapaId: string, funilId: string, organizacaoId: string) {
  const etapa = await prisma.etapaFunil.findFirst({ where: { id: etapaId, funilId } })
  if (!etapa) throw new Error('Etapa não encontrada')

  return prisma.lead.update({
    where: { id: leadId, organizacaoId },
    data: { etapaId, funilId },
    include: { etapa: true, tags: { include: { tag: true } } },
  })
}

export async function addTag(leadId: string, tagId: string, organizacaoId: string) {
  // Verifica ownership
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizacaoId } })
  if (!lead) throw new Error('Lead não encontrado')
  const tag = await prisma.tag.findFirst({ where: { id: tagId, organizacaoId } })
  if (!tag) throw new Error('Tag não encontrada')

  return prisma.leadTag.create({ data: { leadId, tagId } })
}

export async function removeTag(leadId: string, tagId: string, organizacaoId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizacaoId } })
  if (!lead) throw new Error('Lead não encontrado')
  return prisma.leadTag.delete({ where: { leadId_tagId: { leadId, tagId } } })
}
