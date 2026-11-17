import type { Report, ReportCreate, ReportList } from '../types'
import { request } from './client'

export function listReports(signal?: AbortSignal): Promise<ReportList> {
  return request<ReportList>('/reports', { query: { limit: 1000 }, signal })
}

/** 201 = pino novo; 200 com merged=true = somou confirmação num registro a menos de 15 m. */
export function createReport(payload: ReportCreate): Promise<Report> {
  return request<Report>('/reports', { method: 'POST', json: payload })
}

export function uploadReportPhoto(id: string, photo: File): Promise<Report> {
  const form = new FormData()
  form.append('photo', photo, photo.name)
  return request<Report>(`/reports/${id}/photo`, { method: 'POST', form })
}

export function upvoteReport(id: string): Promise<Report> {
  return request<Report>(`/reports/${id}/upvote`, { method: 'POST' })
}

export function deleteReport(id: string): Promise<void> {
  return request<void>(`/reports/${id}`, { method: 'DELETE' })
}
