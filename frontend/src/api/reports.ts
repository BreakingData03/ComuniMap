import { DEMO_MODE } from '../config'
import type { Report, ReportCreate, ReportList } from '../types'
import { request } from './client'
import * as demo from './demo'

export function listReports(signal?: AbortSignal): Promise<ReportList> {
  if (DEMO_MODE) return demo.listReports()
  return request<ReportList>('/reports', { query: { limit: 1000 }, signal })
}

/** 201 = pino novo; 200 com merged=true = somou confirmação num registro a menos de 15 m. */
export function createReport(payload: ReportCreate): Promise<Report> {
  if (DEMO_MODE) return demo.createReport(payload)
  return request<Report>('/reports', { method: 'POST', json: payload })
}

export function uploadReportPhoto(id: string, photo: File): Promise<Report> {
  if (DEMO_MODE) return demo.uploadReportPhoto(id, photo)
  const form = new FormData()
  form.append('photo', photo, photo.name)
  return request<Report>(`/reports/${id}/photo`, { method: 'POST', form })
}

export function upvoteReport(id: string): Promise<Report> {
  if (DEMO_MODE) return demo.upvoteReport(id)
  return request<Report>(`/reports/${id}/upvote`, { method: 'POST' })
}

export function deleteReport(id: string): Promise<void> {
  if (DEMO_MODE) return demo.deleteReport(id)
  return request<void>(`/reports/${id}`, { method: 'DELETE' })
}
