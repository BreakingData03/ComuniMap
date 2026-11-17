import { useState, type FormEvent } from 'react'
import { useToast } from '../../context/ToastContext'
import { useReportLocation } from '../../hooks/useReportLocation'
import type { DonationIntent } from '../../types'
import { LocationPicker } from '../LocationPicker'
import { Modal } from '../Modal'
import { PhotoField } from '../PhotoField'
import { StreetField } from '../StreetField'
import { FIELD, LABEL, SELECT_ROW, SELECT_ROW_STACKED, useReportSubmit, type ReportFormProps } from './shared'

const F = FIELD.amber
const CONTATO_OK =
  'w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 transition-colors'
const CONTATO_ERRO =
  'w-full bg-rose-500/10 border border-rose-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 transition-colors'

export function CharityForm({ open, externalPick, onClose, onRequestMapPick, onSubmit }: ReportFormProps) {
  const showToast = useToast()
  const location = useReportLocation(open, externalPick)
  const { saving, submit } = useReportSubmit(location, onSubmit)

  const [titulo, setTitulo] = useState('')
  const [intent, setIntent] = useState<DonationIntent>('precisa')
  const [categoria, setCategoria] = useState('Alimentos')
  const [contato, setContato] = useState('')
  const [contatoInvalido, setContatoInvalido] = useState(false)
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  function limpar() {
    setTitulo('')
    setIntent('precisa')
    setCategoria('Alimentos')
    setContato('')
    setContatoInvalido(false)
    setDesc('')
    setPhoto(null)
    location.reset()
  }

  // Mensagem de erro do WhatsApp: ao enviar (inválido) ou enquanto ainda faltam dígitos.
  let erroContato: string | null = null
  if (contatoInvalido) {
    erroContato = `Você digitou apenas ${contato.length} de 11 números requeridos (DDD + WhatsApp).`
  } else if (contato.length > 0 && contato.length < 11) {
    erroContato = `Faltam ${11 - contato.length} dígito(s) (informe 11 números).`
  }

  function salvarCaridade(e: FormEvent) {
    e.preventDefault()

    // Validação estrita: exatamente 11 dígitos (DDD + 9 dígitos)
    if (contato.length !== 11) {
      setContatoInvalido(true)
      showToast('Contato inválido: informe 11 números (DDD + celular).', 'error')
      return
    }

    void submit(
      (pos) => ({
        category: 'caridade',
        title: titulo,
        donation_intent: intent,
        item_category: categoria,
        neighborhood: location.neighborhood,
        street: location.street,
        contact_whatsapp: contato,
        description: desc,
        ...pos,
      }),
      photo,
      limpar,
    )
  }

  return (
    <Modal open={open} onClose={onClose} icon="fa-solid fa-hand-holding-heart text-amber-400" title="Caridades & Doações">
      <form onSubmit={salvarCaridade} className="space-y-3">
        <div>
          <label htmlFor="caridade-titulo" className={LABEL}>Título da Ação ou Ponto *</label>
          <input
            type="text"
            id="caridade-titulo"
            required
            maxLength={120}
            placeholder="Ex: Arrecadação de Roupas / Doação de Alimentos"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className={F.input}
          />
        </div>

        <div className={SELECT_ROW_STACKED}>
          <div>
            <label htmlFor="caridade-intent" className={LABEL}>Tipo de Ação</label>
            <select
              id="caridade-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value as DonationIntent)}
              className={F.select}
            >
              <option value="precisa">🤲 Precisa / Aceita Doação</option>
              <option value="doando">🎁 Oferece / Quer Doar</option>
            </select>
          </div>
          <div>
            <label htmlFor="caridade-categoria" className={LABEL}>Categoria do Item</label>
            <select id="caridade-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={F.select}>
              <option value="Alimentos">🍱 Alimentos / Cestas</option>
              <option value="Roupas">👕 Roupas e Calçados</option>
              <option value="Móveis">🛋️ Móveis / Utensílios</option>
              <option value="Diversos">📦 Diversos</option>
            </select>
          </div>
        </div>

        <div className={SELECT_ROW}>
          <div>
            <label htmlFor="caridade-bairro" className={LABEL}>Bairro *</label>
            <input
              type="text"
              id="caridade-bairro"
              required
              maxLength={120}
              placeholder="Ex: Vila Nova"
              value={location.neighborhood}
              onChange={(e) => location.setNeighborhood(e.target.value)}
              className={F.input}
            />
          </div>
          <div>
            <label htmlFor="caridade-contato" className={LABEL}>Contato / WhatsApp (11 dígitos) *</label>
            <input
              type="text"
              inputMode="numeric"
              id="caridade-contato"
              required
              maxLength={11}
              placeholder="67999998888"
              value={contato}
              onChange={(e) => {
                // Só números (impede letras e símbolos)
                setContato(e.target.value.replace(/\D/g, ''))
                setContatoInvalido(false)
              }}
              className={contatoInvalido ? CONTATO_ERRO : CONTATO_OK}
            />
            {erroContato && (
              <p className="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{erroContato}</span>
              </p>
            )}
          </div>
        </div>

        <StreetField
          id="caridade-rua"
          value={location.street}
          onChange={location.setStreet}
          onSelect={location.selectStreet}
          inputClassName={F.input}
        />

        <div>
          <label htmlFor="caridade-desc" className={LABEL}>Descrição dos Itens / Instruções *</label>
          <textarea
            id="caridade-desc"
            rows={2}
            required
            maxLength={2000}
            placeholder="Descreva os itens doados ou necessários e como fazer para entregar/retirar..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={F.input}
          ></textarea>
        </div>

        <PhotoField id="caridade-foto" photo={photo} onChange={setPhoto} />

        <LocationPicker mode="caridade" visible={open} location={location} onRequestMapPick={onRequestMapPick} />

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-500 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg shadow-amber-600/30 disabled:opacity-60"
          >
            {saving ? 'Enviando...' : 'Publicar Doação'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
