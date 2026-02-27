import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useTags() {
  const { data, isLoading, error, mutate } = useSWR('/api/tags', fetcher)
  return { tags: data ?? [], isLoading, error, mutate }
}
