import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  icon: string
  title: string
  children: ReactNode
}

/**
 * Casca dos modais de cadastro. Fica montado mesmo fechado (só com `hidden`) para o
 * formulário não perder o que foi digitado enquanto a pessoa marca o ponto no mapa.
 */
export function Modal({ open, onClose, icon, title, children }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`${open ? 'flex' : 'hidden'} fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto`}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <i className={icon}></i>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-white transition w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-800"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
