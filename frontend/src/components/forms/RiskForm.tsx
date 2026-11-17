import { useState, type FormEvent } from 'react'
import { useReportLocation } from '../../hooks/useReportLocation'
import type { RiskLevel } from '../../types'
import { LocationPicker } from '../LocationPicker'
import { Modal } from '../Modal'
import { PhotoField } from '../PhotoField'
import { StreetField } from '../StreetField'
import { FIELD, LABEL, SELECT_ROW, useReportSubmit, type ReportFormProps } from './shared'

const F = FIELD.rose

export function RiskForm({ open, externalPick, onClose, onRequestMapPick, onSubmit }: ReportFormProps) {
  const location = useReportLocation(open, externalPick)
  const { saving, submit } = useReportSubmit(location, onSubmit)

  const [titulo, setTitulo] = useState('')
  const [nivel, setNivel] = useState<RiskLevel>('medio')
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  function limpar() {
    setTitulo('')
    setNivel('medio')
    setDesc('')
    setPhoto(null)
    location.reset()
  }

  function salvarRisco(e: FormEvent) {
    e.preventDefault()
    void submit(
      (pos) => ({
        category: 'perigo',
        title: titulo,
        risk_level: nivel,
        neighborhood: location.neighborhood,
        street: location.street,
        description: desc,
        ...pos,
      }),
      photo,
      limpar,
    )
  }

  return (
    <Modal open={open} onClose={onClose} icon="fa-solid fa-triangle-exclamation text-rose-500" title="Reportar Perigo ou Risco">
      <form onSubmit={salvarRisco} className="space-y-3">
        <div>
          <label htmlFor="risco-titulo" className={LABEL}>Título do Problema *</label>
          <input
            type="text"
            id="risco-titulo"
            required
            maxLength={120}
            placeholder="Ex: Buraco na via / Fios soltos"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className={F.input}
          />
        </div>

        <div className={SELECT_ROW}>
          <div>
            <label htmlFor="risco-nivel" className={LABEL}>Nível de Risco</label>
            <select id="risco-nivel" value={nivel} onChange={(e) => setNivel(e.target.value as RiskLevel)} className={F.select}>
              <option value="alto">🔴 Alto Risco</option>
              <option value="medio">🟡 Médio Risco</option>
              <option value="baixo">🟢 Baixo Risco</option>
            </select>
          </div>
          <div>
            <label htmlFor="risco-bairro" className={LABEL}>Bairro *</label>
            <input
              type="text"
              id="risco-bairro"
              required
              maxLength={120}
              placeholder="Ex: Santos Dumont"
              value={location.neighborhood}
              onChange={(e) => location.setNeighborhood(e.target.value)}
              className={F.input}
            />
          </div>
        </div>

        <StreetField
          id="risco-rua"
          value={location.street}
          onChange={location.setStreet}
          onSelect={location.selectStreet}
          inputClassName={F.input}
        />

        <div>
          <label htmlFor="risco-desc" className={LABEL}>Descrição do Problema *</label>
          <textarea
            id="risco-desc"
            rows={2}
            required
            maxLength={2000}
            placeholder="Detalhes do risco observado para orientar a comunidade..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={F.input}
          ></textarea>
        </div>

        <PhotoField id="risco-foto" photo={photo} onChange={setPhoto} />

        <LocationPicker mode="risco" visible={open} location={location} onRequestMapPick={onRequestMapPick} />

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-rose-600 hover:bg-rose-500 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg shadow-rose-600/30 disabled:opacity-60"
          >
            {saving ? 'Enviando...' : 'Cadastrar Perigo'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
