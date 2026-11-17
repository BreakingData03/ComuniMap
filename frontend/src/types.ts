export type Category = 'perigo' | 'caridade' | 'evento' | 'comunidade'
export type RiskLevel = 'alto' | 'medio' | 'baixo'
export type DonationIntent = 'precisa' | 'doando'
export type ReportStatus = 'pending' | 'in_progress' | 'resolved'
export type PhotoStatus = 'none' | 'processing' | 'ready' | 'rejected'

export interface LatLng {
  lat: number
  lng: number
}

/** Formato devolvido por GET/POST /api/v1/reports. */
export interface Report extends LatLng {
  id: string
  category: Category
  title: string
  description: string
  neighborhood: string
  street: string | null
  risk_level: RiskLevel | null
  contact_whatsapp: string | null
  donation_intent: DonationIntent | null
  item_category: string | null
  starts_at: string | null
  ends_at: string | null
  photo_url: string | null
  photo_thumb_url: string | null
  photo_status: PhotoStatus
  upvotes: number
  status: ReportStatus
  created_by: string | null
  created_at: string
  /** true quando o POST caiu num registro já existente a menos de 15 m. */
  merged: boolean
}

export interface ReportList {
  items: Report[]
  total: number
}

/** Corpo do POST /api/v1/reports. */
export interface ReportCreate extends LatLng {
  category: Category
  title: string
  description: string
  neighborhood: string
  street?: string | null
  risk_level?: RiskLevel | null
  contact_whatsapp?: string | null
  donation_intent?: DonationIntent | null
  item_category?: string | null
  starts_at?: string | null
  ends_at?: string | null
}

export interface User {
  id: string
  name: string
  email: string
  role: 'citizen' | 'agent' | 'admin'
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

/** Qual dos três modais de cadastro está em jogo. */
export type FormMode = 'risco' | 'evento' | 'caridade'

/** Filtro ativo do mapa/lista. */
export type Filter = 'todos' | Category

/** Ponto escolhido no mapa principal para um formulário (seq muda a cada escolha). */
export interface MapPick extends LatLng {
  mode: FormMode
  seq: number
}

export type ToastType = 'info' | 'success' | 'error'
