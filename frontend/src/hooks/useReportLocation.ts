import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { geocodeAddress, reverseGeocode } from '../lib/geocoding'
import { getCurrentPosition, type GeoFailure } from '../lib/geolocation'
import type { StreetSuggestion } from '../lib/streets'
import type { LatLng, MapPick } from '../types'

const DEFAULT_LABEL = 'Arraste o pino ou informe o endereço'

/** De onde veio a posição: GPS automático, pino arrastado ou toque no mapa principal. */
type Source = 'gps' | 'pin' | 'map'

function coordsLabel({ lat, lng }: LatLng): string {
  return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
}

/**
 * Localização de um formulário de registro.
 *
 * Ordem de preferência: GPS automático ao abrir o modal → pino arrastável / toque no mapa →
 * rua escolhida na sugestão → endereço digitado (geocodificado só no envio, como fallback).
 */
export function useReportLocation(open: boolean, externalPick: MapPick | null) {
  const showToast = useToast()

  const [pos, setPos] = useState<LatLng | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [street, setStreet] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [label, setLabel] = useState(DEFAULT_LABEL)
  const [locating, setLocating] = useState(false)

  // Refs: os callbacks assíncronos (GPS, Nominatim) precisam do valor atual, não do render antigo.
  const confirmedRef = useRef(false)
  const lookupSeq = useRef(0)

  const setFromPoint = useCallback(
    async (point: LatLng, source: Source) => {
      confirmedRef.current = true
      setPos(point)
      setConfirmed(true)
      setLabel(coordsLabel(point))

      const seq = ++lookupSeq.current
      if (source !== 'gps') showToast('Buscando endereço do local...', 'info')

      const address = await reverseGeocode(point)
      if (seq !== lookupSeq.current) return // o pino já foi movido de novo

      if (address && (address.street || address.neighborhood)) {
        // GPS automático não sobrescreve o que a pessoa já digitou; mover o pino sobrescreve.
        const keepTyped = source === 'gps'
        setStreet((current) => (keepTyped && current) || address.street || current)
        setNeighborhood((current) => (keepTyped && current) || address.neighborhood || current)
        setLabel([address.street, address.neighborhood].filter(Boolean).join(', ') || coordsLabel(point))
        if (source !== 'gps') showToast('Endereço e bairro preenchidos automaticamente!', 'success')
      } else if (source !== 'gps') {
        showToast('Posição selecionada com sucesso!', 'success')
      }
    },
    [showToast],
  )

  /** auto = disparo ao abrir o modal (silencioso); manual = botão de GPS. */
  const locate = useCallback(
    async (auto: boolean) => {
      setLocating(true)
      if (!confirmedRef.current) setLabel('Obtendo sua posição por GPS...')
      try {
        const point = await getCurrentPosition()
        // Se a pessoa já marcou o ponto enquanto o GPS respondia, a escolha dela vale.
        if (auto && confirmedRef.current) return
        await setFromPoint(point, 'gps')
      } catch (err) {
        const failure = err as GeoFailure
        if (!confirmedRef.current) {
          setLabel(
            failure === 'denied'
              ? 'GPS sem permissão: arraste o pino ou preencha o endereço'
              : 'GPS indisponível: arraste o pino ou preencha o endereço',
          )
        }
        if (!auto) showToast('Erro ao obter localização.', 'error')
      } finally {
        setLocating(false)
      }
    },
    [setFromPoint, showToast],
  )

  // Ponto vindo do "Marcar Ponto" no mapa principal. Precisa rodar antes do efeito do GPS.
  const pickSeq = externalPick?.seq
  useEffect(() => {
    if (externalPick) void setFromPoint({ lat: externalPick.lat, lng: externalPick.lng }, 'map')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickSeq])

  // Captura automática de GPS ao abrir o modal, se ainda não há ponto definido.
  useEffect(() => {
    if (open && !confirmedRef.current) void locate(true)
  }, [open, locate])

  const movePin = useCallback((point: LatLng) => void setFromPoint(point, 'pin'), [setFromPoint])

  const selectStreet = useCallback(
    (item: StreetSuggestion) => {
      lookupSeq.current++ // cancela geocodificação reversa pendente
      confirmedRef.current = true
      setStreet(item.nome)
      setNeighborhood(item.bairro.split('/')[0].trim())
      setPos({ lat: item.lat, lng: item.lng })
      setConfirmed(true)
      setLabel(`${item.nome} (${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`)
      showToast('Localização definida. Preencha os dados e clique em publicar.', 'info')
    },
    [showToast],
  )

  /** Posição final para o envio. Sem ponto marcado, tenta geocodificar o endereço digitado. */
  const resolve = useCallback(async (): Promise<LatLng | null> => {
    if (confirmedRef.current && pos) return pos
    const found = await geocodeAddress(street, neighborhood)
    if (found) {
      confirmedRef.current = true
      setPos(found)
      setConfirmed(true)
      setLabel([street, neighborhood].filter(Boolean).join(', '))
    }
    return found
  }, [pos, street, neighborhood])

  const reset = useCallback(() => {
    lookupSeq.current++
    confirmedRef.current = false
    setPos(null)
    setConfirmed(false)
    setStreet('')
    setNeighborhood('')
    setLabel(DEFAULT_LABEL)
  }, [])

  return {
    pos,
    confirmed,
    street,
    neighborhood,
    label,
    locating,
    setStreet,
    setNeighborhood,
    movePin,
    selectStreet,
    locate,
    resolve,
    reset,
  }
}

export type ReportLocation = ReturnType<typeof useReportLocation>
