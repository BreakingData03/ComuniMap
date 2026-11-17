import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ToastType } from '../types'

type ShowToast = (message: string, type?: ToastType) => void

const ToastContext = createContext<ShowToast>(() => {})

const ICONS: Record<ToastType, string> = {
  success: 'fa-solid fa-circle-check text-emerald-400 text-lg',
  error: 'fa-solid fa-circle-xmark text-rose-400 text-lg',
  info: 'fa-solid fa-circle-info text-blue-400 text-lg',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const showToast = useCallback<ShowToast>((message, type = 'info') => {
    window.clearTimeout(timer.current)
    setToast({ message, type })
    timer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  const value = useMemo(() => showToast, [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* z acima da tela de login (z-[100]) para os avisos de autenticação aparecerem */}
      <div
        role="status"
        aria-live="polite"
        className={`${toast ? 'flex' : 'hidden'} fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[110] bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 items-center gap-3 transition-all duration-300 max-w-sm`}
      >
        <i className={ICONS[toast?.type ?? 'info']}></i>
        <span className="text-xs sm:text-sm font-medium">{toast?.message}</span>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  return useContext(ToastContext)
}
