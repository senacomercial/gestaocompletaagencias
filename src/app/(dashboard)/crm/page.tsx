import { requireAuth } from '@/lib/auth'
import { getFunis } from '@/lib/services/funis'
import { getKanbanData } from '@/lib/services/leads'
import { KanbanView } from '@/components/crm/KanbanView'
import type { FunilComEtapas, KanbanColuna } from '@/types'

export const metadata = { title: 'CRM — Kanban' }

export default async function CrmPage() {
  const session = await requireAuth()
  const funis = await getFunis(session.user.organizacaoId)

  // Carrega kanban do primeiro funil para SSR
  let initialKanban: FunilComEtapas | null = null
  if (funis.length > 0) {
    initialKanban = await getKanbanData(session.user.organizacaoId, funis[0].id)
  }

  // Monta lista de funis com etapas no formato FunilComEtapas para o modal
  const funisComEtapas: FunilComEtapas[] = funis.map((f) => ({
    id: f.id,
    nome: f.nome,
    descricao: f.descricao,
    ordem: f.ordem,
    etapas: f.etapas.map((e) => ({ ...e, leads: [] })) as KanbanColuna[],
  }))

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <KanbanView
        initialFunis={initialKanban ? [initialKanban, ...funisComEtapas.slice(1)] : funisComEtapas}
      />
    </div>
  )
}
