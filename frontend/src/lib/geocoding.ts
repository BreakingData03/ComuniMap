import { CITY } from '../config'
import type { LatLng } from '../types'
import type { StreetSuggestion } from './streets'

// Nominatim (OpenStreetMap). Política de uso: no máximo 1 requisição por segundo,
// por isso só consultamos em eventos pontuais (soltar o pino, GPS, envio), nunca a cada tecla.
const NOMINATIM = 'https://nominatim.openstreetmap.org'

export interface Address {
  street: string
  neighborhood: string
}

interface NominatimAddress {
  suburb?: string
  neighbourhood?: string
  residential?: string
  district?: string
  city_district?: string
  subdivision?: string
  road?: string
  pedestrian?: string
  street?: string
  footway?: string
  path?: string
}

/** Coordenada → rua e bairro. Devolve null se o serviço falhar. */
export async function reverseGeocode({ lat, lng }: LatLng): Promise<Address | null> {
  try {
    const url = `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt-BR`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = (await response.json()) as { address?: NominatimAddress }
    const a = data.address ?? {}
    return {
      neighborhood:
        a.suburb || a.neighbourhood || a.residential || a.district || a.city_district || a.subdivision || '',
      street: a.road || a.pedestrian || a.street || a.footway || a.path || '',
    }
  } catch (err) {
    console.warn('Erro no serviço de geocodificação:', err)
    return null
  }
}

async function search(query: string): Promise<{ name: string; lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=pt-BR`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = (await response.json()) as { display_name: string; lat: string; lon: string }[]
    if (!data.length) return null
    return {
      name: data[0].display_name.split(',')[0],
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  } catch (err) {
    console.warn('Erro ao buscar via Nominatim:', err)
    return null
  }
}

/** Busca uma rua pelo nome dentro da cidade (item "Buscar ... em Três Lagoas" da sugestão). */
export async function searchStreet(rua: string): Promise<StreetSuggestion | null> {
  const found = await search(`${rua}, ${CITY.geocodeSuffix}`)
  if (!found) return null
  return { nome: found.name || rua, bairro: 'Três Lagoas - MS', tipo: 'Local', lat: found.lat, lng: found.lng }
}

/** Fallback do preenchimento manual: endereço digitado → coordenada. */
export async function geocodeAddress(street: string, neighborhood: string): Promise<LatLng | null> {
  const parts = [street.trim(), neighborhood.trim()].filter(Boolean)
  if (!parts.length) return null
  const found = await search(`${parts.join(', ')}, ${CITY.geocodeSuffix}`)
  return found ? { lat: found.lat, lng: found.lng } : null
}
