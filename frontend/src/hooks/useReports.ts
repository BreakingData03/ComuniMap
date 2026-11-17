import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as reportsApi from '../api/reports'
import type { Report, ReportList } from '../types'

const REPORTS_KEY = ['reports'] as const

/** Lista de registros da API; revalida a cada minuto para trazer pinos de outras pessoas. */
export function useReports() {
  return useQuery({
    queryKey: REPORTS_KEY,
    queryFn: ({ signal }) => reportsApi.listReports(signal),
    refetchInterval: 60_000,
    staleTime: 15_000,
  })
}

/** Substitui um registro no cache sem esperar o próximo GET. */
export function useReportCache() {
  const queryClient = useQueryClient()

  return {
    upsert(report: Report) {
      queryClient.setQueryData<ReportList>(REPORTS_KEY, (current) => {
        if (!current) return current
        const exists = current.items.some((item) => item.id === report.id)
        return exists
          ? { ...current, items: current.items.map((item) => (item.id === report.id ? report : item)) }
          : { items: [report, ...current.items], total: current.total + 1 }
      })
    },
    remove(id: string) {
      queryClient.setQueryData<ReportList>(REPORTS_KEY, (current) =>
        current ? { items: current.items.filter((item) => item.id !== id), total: Math.max(0, current.total - 1) } : current,
      )
    },
    refresh() {
      return queryClient.invalidateQueries({ queryKey: REPORTS_KEY })
    },
  }
}

export function useDeleteReport() {
  const cache = useReportCache()
  return useMutation({
    mutationFn: (id: string) => reportsApi.deleteReport(id),
    onSuccess: (_data, id) => cache.remove(id),
  })
}

export function useUpvoteReport() {
  const cache = useReportCache()
  return useMutation({
    mutationFn: (id: string) => reportsApi.upvoteReport(id),
    onSuccess: (report) => cache.upsert(report),
  })
}
