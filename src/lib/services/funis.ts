import { prisma } from '@/lib/prisma'
import type { CreateFunilInput, UpdateFunilInput, CreateEtapaInput, UpdateEtapaInput } from '@/lib/validators/funil'

export async function getFunis(organizacaoId: string) {
  return prisma.funil.findMany({
    where: { organizacaoId },
    orderBy: { ordem: 'asc' },
    include: {
      _count: { select: { leads: true, etapas: true } },
      etapas: { orderBy: { ordem: 'asc' }, select: { id: true, nome: true, cor: true, ordem: true, isVendaRealizada: true } },
    },
  })
}

export async function getFunilComEtapas(id: string, organizacaoId: string) {
  return prisma.funil.findFirst({
    where: { id, organizacaoId },
    include: {
      etapas: {
        orderBy: { ordem: 'asc' },
        include: {
          leads: {
            where: { status: 'ATIVO' },
            orderBy: { createdAt: 'desc' },
            include: {
              tags: { include: { tag: true } },
            },
          },
        },
      },
    },
  })
}

export async function createFunil(data: CreateFunilInput, organizacaoId: string) {
  const count = await prisma.funil.count({ where: { organizacaoId } })
  return prisma.funil.create({
    data: { ...data, organizacaoId, ordem: data.ordem ?? count },
  })
}

export async function updateFunil(id: string, data: UpdateFunilInput, organizacaoId: string) {
  return prisma.funil.update({
    where: { id, organizacaoId },
    data,
  })
}

export async function deleteFunil(id: string, organizacaoId: string) {
  const leadsCount = await prisma.lead.count({ where: { funilId: id, organizacaoId } })
  if (leadsCount > 0) {
    throw new Error(`Este funil tem ${leadsCount} lead(s). Mova-os antes de deletar.`)
  }
  return prisma.funil.delete({ where: { id, organizacaoId } })
}

export async function createEtapa(funilId: string, data: CreateEtapaInput, organizacaoId: string) {
  const funil = await prisma.funil.findFirst({ where: { id: funilId, organizacaoId } })
  if (!funil) throw new Error('Funil não encontrado')
  const count = await prisma.etapaFunil.count({ where: { funilId } })
  return prisma.etapaFunil.create({
    data: { ...data, funilId, ordem: data.ordem ?? count },
  })
}

export async function updateEtapa(etapaId: string, funilId: string, data: UpdateEtapaInput, organizacaoId: string) {
  const funil = await prisma.funil.findFirst({ where: { id: funilId, organizacaoId } })
  if (!funil) throw new Error('Funil não encontrado')
  return prisma.etapaFunil.update({ where: { id: etapaId, funilId }, data })
}

export async function deleteEtapa(etapaId: string, funilId: string, organizacaoId: string) {
  const funil = await prisma.funil.findFirst({ where: { id: funilId, organizacaoId } })
  if (!funil) throw new Error('Funil não encontrado')
  const leadsCount = await prisma.lead.count({ where: { etapaId, organizacaoId } })
  if (leadsCount > 0) throw new Error(`Esta etapa tem ${leadsCount} lead(s). Mova-os antes de deletar.`)
  return prisma.etapaFunil.delete({ where: { id: etapaId, funilId } })
}

export async function reordenarEtapas(funilId: string, etapaIds: string[], organizacaoId: string) {
  const funil = await prisma.funil.findFirst({ where: { id: funilId, organizacaoId } })
  if (!funil) throw new Error('Funil não encontrado')
  await prisma.$transaction(
    etapaIds.map((id, index) =>
      prisma.etapaFunil.update({ where: { id, funilId }, data: { ordem: index } })
    )
  )
}
