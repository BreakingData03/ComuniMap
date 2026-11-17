import { useState, type FormEvent } from 'react'
import { useReportLocation } from '../../hooks/useReportLocation'
import { LocationPicker } from '../LocationPicker'
import { Modal } from '../Modal'
import { PhotoField } from '../PhotoField'
import { StreetField } from '../StreetField'
import { FIELD, LABEL, SELECT_ROW_WIDE, useReportSubmit, type ReportFormProps } from './shared'

const F = FIELD.emerald

export function EventForm({ open, externalPick, onClose, onRequestMapPick, onSubmit }: ReportFormProps) {
  const location = useReportLocation(open, externalPick)
  const { saving, submit } = useReportSubmit(location, onSubmit)

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<'comunidade' | 'evento'>('comunidade')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  function limpar() {
    setTitulo('')
    setTipo('comunidade')
    setInicio('')
    setFim('')
    setDesc('')
    setPhoto(null)
    location.reset()
  }

  function salvarEvento(e: FormEvent) {
    e.preventDefault()
    void submit(
      (pos) => ({
        category: tipo,
        title: titulo,
        neighborhood: location.neighborhood,
        street: location.street,
        starts_at: inicio || null,
        ends_at: fim || null,
        description: desc,
        ...pos,
      }),
      photo,
      limpar,
    )
  }

  return (
    <Modal open={open} onClose={onClose} icon="fa-solid fa-calendar-plus text-emerald-400" title="Criar Novo Ponto / Evento">
      <form onSubmit={salvarEvento} className="space-y-3">
        <div>
          <label htmlFor="evento-titulo" className={LABEL}>Título do Evento ou Local *</label>
          <input
            type="text"
            id="evento-titulo"
            required
            maxLength={120}
            placeholder="Ex: Feira de Artesanato / Praça da Vila"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className={F.input}
          />
        </div>

        <div className={SELECT_ROW_WIDE}>
          <div>
            <label htmlFor="evento-tipo" className={LABEL}>Tipo de Registro</label>
            <select
              id="evento-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'comunidade' | 'evento')}
              className={F.select}
            >
              <option value="comunidade">🏘️ Ponto Comunitário</option>
              <option value="evento">🥳 Festa / Evento</option>
            </select>
          </div>
          <div>
            <label htmlFor="evento-bairro" className={LABEL}>Bairro *</label>
            <input
              type="text"
              id="evento-bairro"
              required
              maxLength={120}
              placeholder="Ex: Centro"
              value={location.neighborhood}
              onChange={(e) => location.setNeighborhood(e.target.value)}
              className={F.input}
            />
          </div>
        </div>

        <StreetField
          id="evento-rua"
          value={location.street}
          onChange={location.setStreet}
          onSelect={location.selectStreet}
          inputClassName={F.input}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="evento-horario-inicio" className={LABEL}>Horário de Início</label>
            <input type="time" id="evento-horario-inicio" value={inicio} onChange={(e) => setInicio(e.target.value)} className={F.time} />
          </div>
          <div>
            <label htmlFor="evento-horario-fim" className={LABEL}>Horário de Término</label>
            <input type="time" id="evento-horario-fim" value={fim} onChange={(e) => setFim(e.target.value)} className={F.time} />
          </div>
        </div>

        <div>
          <label htmlFor="evento-desc" className={LABEL}>Descrição / Observações *</label>
          <textarea
            id="evento-desc"
            rows={2}
            required
            maxLength={2000}
            placeholder="Descreva os detalhes da atração ou informações do local..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={F.input}
          ></textarea>
        </div>

        <PhotoField id="evento-foto" photo={photo} onChange={setPhoto} />

        <LocationPicker mode="evento" visible={open} location={location} onRequestMapPick={onRequestMapPick} />

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 disabled:opacity-60"
          >
            {saving ? 'Enviando...' : 'Publicar Ponto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
