import type { FormMode, User } from '../types'

interface HeaderProps {
  user: User | null
  onOpenModal: (mode: FormMode) => void
  onLogout: () => void
}

export function Header({ user, onOpenModal, onLogout }: HeaderProps) {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-emerald-500/20">
            <i className="fa-solid fa-map-location-dot"></i>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight flex items-center gap-2 truncate">
              ComuniMap
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium hidden sm:inline">
                Três Lagoas-MS
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">Mapeamento Urbano Colaborativo</p>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO RÁPIDA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* BADGE DO USUÁRIO LOGADO */}
          {user && (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-2 sm:px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <i className="fa-solid fa-circle-user text-emerald-400 text-sm"></i>
              <span className="font-semibold truncate max-w-[100px] hidden md:inline">{user.name}</span>
              <button
                type="button"
                onClick={onLogout}
                title="Sair da Conta"
                aria-label="Sair da Conta"
                className="text-slate-400 hover:text-rose-400 transition ml-1"
              >
                <i className="fa-solid fa-power-off text-xs"></i>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenModal('risco')}
            aria-label="Reportar Perigo"
            className="bg-rose-600/90 hover:bg-rose-500 text-white text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2 active:scale-95"
          >
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span className="hidden sm:inline">Reportar Perigo</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('caridade')}
            aria-label="Doações / Caridade"
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-amber-600/20 flex items-center gap-2 active:scale-95"
          >
            <i className="fa-solid fa-hand-holding-heart"></i>
            <span className="hidden sm:inline">Doações / Caridade</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('evento')}
            aria-label="Criar Ponto"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
          >
            <i className="fa-solid fa-plus"></i>
            <span className="hidden sm:inline">Criar Ponto</span>
          </button>
        </div>
      </div>
    </header>
  )
}
