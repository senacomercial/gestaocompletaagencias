import useSWR from 'swr'
import type { FunilComEtapas } from '@/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useKanban(funilId: string | null, fallbackData?: FunilComEtapas | null) {
  const { data, isLoading, error, mutate } = useSWR<FunilComEtapas>(
    funilId ? `/api/funis/${funilId}/kanban` : null,
    fetcher,
    { fallbackData: fallbackData ?? undefined }
  )
  return { kanban: data ?? null, isLoading, error, mutate }
}
