import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useFunis() {
  const { data, isLoading, error, mutate } = useSWR('/api/funis', fetcher)
  return { funis: data ?? [], isLoading, error, mutate }
}
