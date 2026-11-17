import type { LatLng } from './types'

/** Cidade atendida por esta instância do front. */
export const CITY = {
  name: 'Três Lagoas',
  geocodeSuffix: 'Três Lagoas, MS, Brasil',
  center: { lat: -20.7849, lng: -51.6997 } satisfies LatLng,
  zoom: 14,
}

interface TileConfig {
  url: string
  options: { maxZoom: number; subdomains?: string; attribution: string }
  /** Classe aplicada ao contêiner do mapa (filtro escuro no fallback). */
  containerClass: string
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// Desde 25/09/2026 o CARTO só serve tiles com chave; sem ela vem a marca "API KEY REQUIRED".
// A chave é gratuita: https://carto.com/basemaps/apikey (restrinja por domínio no painel deles,
// já que ela fica visível no navegador).
const CARTO_KEY = (import.meta.env.VITE_CARTO_API_KEY ?? '').trim()

/**
 * Com VITE_CARTO_API_KEY: tema escuro CARTO Dark Matter.
 * Sem a chave: tiles do OpenStreetMap escurecidos por CSS, para o mapa continuar no tema dark.
 */
export const TILE_LAYER: TileConfig = CARTO_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`,
      options: {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
      },
      containerClass: '',
    }
  : {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: { maxZoom: 19, attribution: OSM_ATTRIBUTION },
      containerClass: 'tiles-dark-filter',
    }
