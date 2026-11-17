import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { CITY, TILE_LAYER } from '../config'
import { useToast } from '../context/ToastContext'
import { reportColors, reportEmoji } from '../lib/format'
import { getCurrentPosition } from '../lib/geolocation'
import type { LatLng, Report } from '../types'

interface MapViewProps {
  reports: Report[]
  /** true enquanto a pessoa escolhe um ponto para um formulário ("Marcar Ponto"). */
  picking: boolean
  onPick: (point: LatLng) => void
  /** Ponto para onde voar; seq força o voo mesmo repetindo a coordenada. */
  focus: (LatLng & { seq: number }) | null
  /** Muda quando o contêiner do mapa pode ter mudado de tamanho/visibilidade. */
  layoutKey: unknown
  onShowInList: (id: string) => void
}

/** Conteúdo do popup montado como DOM: texto de usuário entra via textContent, nunca como HTML. */
function buildPopup(report: Report, onShowInList: (id: string) => void): HTMLElement {
  const root = document.createElement('div')
  root.className = 'p-1 max-w-[220px]'

  const header = document.createElement('div')
  header.className = 'flex items-center gap-1.5 font-bold text-sm text-slate-100 mb-1'
  const emoji = document.createElement('span')
  emoji.textContent = reportEmoji(report)
  const title = document.createElement('span')
  title.className = 'truncate'
  title.textContent = report.title
  header.append(emoji, title)

  const desc = document.createElement('p')
  desc.className = 'text-xs text-slate-300 mb-2 leading-relaxed'
  desc.textContent = report.description

  const footer = document.createElement('div')
  footer.className = 'flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800'
  const place = document.createElement('span')
  place.textContent = `📍 ${report.neighborhood}`
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'text-emerald-400 hover:underline font-semibold'
  button.textContent = 'Ver na Lista'
  button.addEventListener('click', () => onShowInList(report.id))
  footer.append(place, button)

  root.append(header, desc, footer)
  return root
}

export function MapView({ reports, picking, onPick, focus, layoutKey, onShowInList }: MapViewProps) {
  const showToast = useToast()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)

  // Os handlers do Leaflet são registrados uma vez; os refs mantêm as props atuais.
  const pickingRef = useRef(picking)
  const onPickRef = useRef(onPick)
  const onShowInListRef = useRef(onShowInList)
  pickingRef.current = picking
  onPickRef.current = onPick
  onShowInListRef.current = onShowInList

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, { zoomControl: false }).setView(
      [CITY.center.lat, CITY.center.lng],
      CITY.zoom,
    )
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickingRef.current) onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  // Marcadores
  useEffect(() => {
    const group = markersRef.current
    if (!group) return
    group.clearLayers()

    for (const report of reports) {
      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="w-8 h-8 rounded-full ${reportColors(report).marker} border-2 border-slate-950 flex items-center justify-center text-white text-xs font-bold shadow-xl transition-all hover:scale-125">
            <span>${reportEmoji(report)}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      L.marker([report.lat, report.lng], { icon, title: report.title })
        .bindPopup(() => buildPopup(report, (id) => onShowInListRef.current(id)))
        .addTo(group)
    }
  }, [reports])

  useEffect(() => {
    if (focus && mapRef.current) mapRef.current.flyTo([focus.lat, focus.lng], 16, { duration: 1.2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.seq])

  // O Leaflet precisa recalcular o tamanho quando o contêiner reaparece (abas mobile, tela de login).
  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 200)
    return () => window.clearTimeout(timer)
  }, [layoutKey])

  useEffect(() => {
    document.body.classList.toggle('crosshair-cursor', picking)
    return () => document.body.classList.remove('crosshair-cursor')
  }, [picking])

  async function obterMinhaLocalizacao() {
    showToast('Obtendo sua posição...', 'info')
    try {
      const pos = await getCurrentPosition()
      mapRef.current?.flyTo([pos.lat, pos.lng], 16)
      showToast('Localização encontrada!', 'success')
    } catch (failure) {
      showToast(failure === 'unsupported' ? 'Geolocalização não suportada.' : 'Erro ao obter localização.', 'error')
    }
  }

  return (
    // isolate: o botão de GPS (z-[400]) fica contido aqui e não vaza por cima dos modais e da tela de login
    <div className="relative isolate flex-1 w-full rounded-2xl overflow-hidden">
      <div id="map" ref={containerRef} className={TILE_LAYER.containerClass}></div>

      {/* BOTÃO DE GEOLOCALIZAÇÃO */}
      <button
        type="button"
        onClick={obterMinhaLocalizacao}
        title="Minha Localização Atual"
        aria-label="Minha Localização Atual"
        className="absolute bottom-4 right-4 z-[400] bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-slate-700 w-11 h-11 rounded-2xl flex items-center justify-center shadow-2xl transition active:scale-90"
      >
        <i className="fa-solid fa-location-arrow text-base"></i>
      </button>
    </div>
  )
}
