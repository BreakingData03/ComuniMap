import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { CITY, TILE_LAYER } from '../config'
import type { ReportLocation } from '../hooks/useReportLocation'
import type { FormMode, LatLng } from '../types'

// Classes literais para o Tailwind enxergar no build.
const ACCENT: Record<FormMode, { pin: string; icon: string }> = {
  risco: { pin: 'marker-pulse-red bg-rose-500', icon: 'fa-solid fa-map-pin text-rose-400' },
  evento: { pin: 'marker-pulse-green bg-emerald-500', icon: 'fa-solid fa-map-pin text-emerald-400' },
  caridade: { pin: 'marker-pulse-amber bg-amber-500', icon: 'fa-solid fa-map-pin text-amber-400' },
}

interface LocationPickerProps {
  mode: FormMode
  /** Modal aberto: o mini-mapa só consegue medir o próprio tamanho quando está visível. */
  visible: boolean
  location: ReportLocation
  /** Abre a seleção no mapa principal ("Marcar Ponto"). */
  onRequestMapPick: () => void
}

/**
 * Mini-mapa com pino arrastável dentro do modal + resumo do local escolhido.
 * Arrastar o pino (ou tocar no mini-mapa) dispara a geocodificação reversa no hook.
 */
export function LocationPicker({ mode, visible, location, onRequestMapPick }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onMoveRef = useRef<(point: LatLng) => void>(location.movePin)
  onMoveRef.current = location.movePin

  const { pos, confirmed } = location

  useEffect(() => {
    if (!containerRef.current) return

    const start: L.LatLngTuple = [CITY.center.lat, CITY.center.lng]
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(start, 15)
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control.attribution({ prefix: false }).addTo(map)
    L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)

    const marker = L.marker(start, {
      draggable: true,
      autoPan: true,
      title: 'Arraste para ajustar o local',
      icon: L.divIcon({
        className: 'picker-pin',
        html: `<div class="w-9 h-9 rounded-full ${ACCENT[mode].pin} border-2 border-white flex items-center justify-center text-white text-sm shadow-xl"><i class="fa-solid fa-location-dot"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    }).addTo(map)

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      onMoveRef.current({ lat, lng })
    })
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      onMoveRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    mapRef.current = map
    markerRef.current = marker
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [mode])

  // Posição vinda de fora (GPS, mapa principal, sugestão de rua) ou reset do formulário.
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    if (pos) {
      marker.setLatLng([pos.lat, pos.lng])
      map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 17))
    } else {
      marker.setLatLng([CITY.center.lat, CITY.center.lng])
      map.setView([CITY.center.lat, CITY.center.lng], 15)
    }
  }, [pos])

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 50)
    return () => window.clearTimeout(timer)
  }, [visible])

  return (
    <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* isolate: os painéis do Leaflet (z-index 400+) não passam por cima da lista de sugestão de ruas */}
      <div className="relative isolate h-40">
        <div ref={containerRef} className={`w-full h-full ${TILE_LAYER.containerClass}`} aria-label="Mapa para ajustar o local do registro"></div>
        <button
          type="button"
          onClick={() => void location.locate(false)}
          disabled={location.locating}
          title="Usar minha localização (GPS)"
          aria-label="Usar minha localização (GPS)"
          className="absolute bottom-2 left-2 z-[500] bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-slate-700 w-9 h-9 rounded-xl flex items-center justify-center shadow-xl transition active:scale-90 disabled:opacity-60"
        >
          <i className={location.locating ? 'fa-solid fa-spinner fa-spin text-sm' : 'fa-solid fa-location-arrow text-sm'}></i>
        </button>
      </div>

      <div className="p-3 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-300 overflow-hidden">
          <span className="font-semibold block text-slate-200">Localização no Mapa:</span>
          <span className={`text-[11px] truncate block ${confirmed ? 'text-emerald-400' : 'text-slate-400'}`}>
            {location.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onRequestMapPick}
          className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
        >
          <i className={ACCENT[mode].icon}></i>
          Marcar Ponto
        </button>
      </div>
    </div>
  )
}
