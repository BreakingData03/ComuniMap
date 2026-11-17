import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useToast } from '../context/ToastContext'
import { compressImage, formatBytes } from '../lib/image'

interface PhotoFieldProps {
  id: string
  /** Foto já comprimida, pronta para envio. */
  photo: File | null
  onChange: (photo: File | null) => void
}

/** Foto opcional do registro: abre a câmera no celular e comprime para WebP no próprio aparelho. */
export function PhotoField({ id, photo, onChange }: PhotoFieldProps) {
  const showToast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    setBusy(true)
    try {
      onChange(await compressImage(file))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível processar a imagem.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-slate-400 font-medium mb-1">Foto (opcional)</label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="sr-only"
      />

      {photo && preview ? (
        <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800 flex items-center gap-3">
          <img src={preview} alt="Prévia da foto" className="w-14 h-14 rounded-xl object-cover border border-slate-800" />
          <div className="text-xs text-slate-300 overflow-hidden flex-1">
            <span className="font-semibold block text-slate-200">Foto pronta para envio</span>
            <span className="text-slate-400 text-[11px] truncate block">
              {photo.type === 'image/webp' ? 'WebP' : 'JPEG'} · {formatBytes(photo.size)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 transition active:scale-95"
          >
            Trocar
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Remover foto"
            aria-label="Remover foto"
            className="shrink-0 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs px-2.5 py-2 rounded-xl border border-slate-700 transition active:scale-95"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full bg-slate-800/80 hover:bg-slate-800 border border-dashed border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-300 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <i className={busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-camera'}></i>
          {busy ? 'Preparando foto...' : 'Tirar foto do local'}
        </button>
      )}
    </div>
  )
}
