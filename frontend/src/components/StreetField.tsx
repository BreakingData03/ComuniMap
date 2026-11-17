import { useEffect, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { searchStreet } from '../lib/geocoding'
import { buscarRuas, type StreetSuggestion } from '../lib/streets'

interface StreetFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  onSelect: (item: StreetSuggestion) => void
  inputClassName: string
}

/** Campo "Rua / Avenida" com sugestão das ruas da cidade e busca no OpenStreetMap. */
export function StreetField({ id, value, onChange, onSelect, inputClassName }: StreetFieldProps) {
  const showToast = useToast()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onDocumentClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [open])

  const termo = value.trim()
  const resultados = open && termo ? buscarRuas(termo) : []

  function escolher(item: StreetSuggestion) {
    setOpen(false)
    onSelect(item)
  }

  async function buscarNoMapa() {
    setOpen(false)
    showToast('Buscando rua no mapa...', 'info')
    const found = await searchStreet(termo)
    if (found) onSelect(found)
    else showToast('Rua não encontrada em Três Lagoas.', 'error')
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <label htmlFor={id} className="block text-xs text-slate-400 font-medium mb-1">Rua / Avenida *</label>
      <input
        type="text"
        id={id}
        required
        maxLength={160}
        placeholder="Digite para ver sugestões..."
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className={inputClassName}
      />
      {open && termo && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-slate-900/95 border border-slate-700 rounded-xl max-h-48 overflow-y-auto custom-scrollbar shadow-2xl z-50 divide-y divide-slate-800">
          {resultados.length > 0 ? (
            resultados.map((item) => (
              <li
                key={item.nome}
                onClick={() => escolher(item)}
                className="p-2.5 hover:bg-slate-800/90 cursor-pointer text-xs flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <i className="fa-solid fa-location-dot text-emerald-400 text-xs shrink-0 group-hover:scale-110 transition-transform"></i>
                  <div className="truncate">
                    <span className="font-bold text-white block truncate">{item.nome}</span>
                    <span className="text-[10px] text-slate-400 truncate block">{item.bairro}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full shrink-0">
                  {item.tipo}
                </span>
              </li>
            ))
          ) : (
            <li
              onClick={() => void buscarNoMapa()}
              className="p-2.5 hover:bg-slate-800 cursor-pointer text-xs flex items-center gap-2 text-slate-300"
            >
              <i className="fa-solid fa-magnifying-glass text-slate-400"></i>
              <span>
                Buscar <strong>"{termo}"</strong> em Três Lagoas-MS
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
