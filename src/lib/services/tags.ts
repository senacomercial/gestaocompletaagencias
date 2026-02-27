import { prisma } from '@/lib/prisma'
import type { CreateTagInput, UpdateTagInput } from '@/lib/validators/tag'

export async function getTags(organizacaoId: string) {
  return prisma.tag.findMany({
    where: { organizacaoId },
    orderBy: { nome: 'asc' },
    include: { _count: { select: { leads: true } } },
  })
}

export async function createTag(data: CreateTagInput, organizacaoId: string) {
  return prisma.tag.create({ data: { ...data, organizacaoId } })
}

export async function updateTag(id: string, data: UpdateTagInput, organizacaoId: string) {
  return prisma.tag.update({ where: { id, organizacaoId }, data })
}

export async function deleteTag(id: string, organizacaoId: string) {
  return prisma.tag.delete({ where: { id, organizacaoId } })
}
