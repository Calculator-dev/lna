import { useInfiniteQuery } from "@tanstack/react-query"
import type { TableState } from "../components/data-table"
import type { Page } from "./api"

/** An admin list loaded a page at a time, in the shape DataTable renders. */
export function usePagedList<T>(key: string, load: (before?: string) => Promise<Page<T>>): TableState<T> {
  const query = useInfiniteQuery({
    queryKey: [key],
    queryFn: ({ pageParam }) => load(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
  })
  return {
    data: query.data?.pages.flatMap(page => page.items),
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
    more: query.hasNextPage
      ? { loading: query.isFetchingNextPage, error: query.isFetchNextPageError ? query.error : null, load: () => void query.fetchNextPage() }
      : undefined,
  }
}
