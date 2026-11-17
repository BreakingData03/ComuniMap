import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const TAB_ACTIVE = 'flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 transition-all shadow-md'
const TAB_IDLE = 'flex-1 py-2 text-xs font-bold rounded-xl text-slate-400 hover:text-white transition-all'
const INPUT_LOGIN =
  'w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500'
const INPUT_CADASTRO =
  'w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

/** Tela de login / cadastro e boas-vindas (primeira coisa que a pessoa vê). */
export function AuthScreen({ onEnter }: { onEnter: () => void }) {
  const { status, user, login, register, logout } = useAuth()
  const showToast = useToast()

  const [tab, setTab] = useState<'login' | 'cadastro'>('login')
  const [busy, setBusy] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [cadNome, setCadNome] = useState('')
  const [cadEmail, setCadEmail] = useState('')
  const [cadSenha, setCadSenha] = useState('')

  async function fazerLogin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const u = await login(loginEmail.trim().toLowerCase(), loginSenha)
      setLoginSenha('')
      showToast(`Bem-vindo, ${u.name}!`, 'success')
    } catch (err) {
      showToast(errorMessage(err, 'E-mail ou senha incorretos!'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function cadastrarUsuario(e: FormEvent) {
    e.preventDefault()
    const email = cadEmail.trim().toLowerCase()
    setBusy(true)
    try {
      await register(cadNome.trim(), email, cadSenha)
      showToast('Cadastro realizado com sucesso! Faça login para continuar.', 'success')
      setCadNome('')
      setCadEmail('')
      setCadSenha('')
      setTab('login')
      setLoginEmail(email)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast('E-mail já cadastrado! Faça login.', 'error')
        setTab('login')
        setLoginEmail(email)
      } else {
        showToast(errorMessage(err, 'Não foi possível concluir o cadastro.'), 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  function sair() {
    logout()
    showToast('Sessão encerrada.', 'info')
  }

  return (
    <div
      id="auth-screen"
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* CARD DE AUTENTICAÇÃO (LOGIN / CADASTRO) */}
      {status === 'anonymous' && (
        <div
          id="auth-card"
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-auto"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg shadow-emerald-500/20 mb-3">
              <i className="fa-solid fa-map-location-dot"></i>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">ComuniMap</h2>
            <p className="text-xs text-slate-400 mt-1">Mapeamento Urbano Colaborativo de Três Lagoas - MS</p>
          </div>

          {/* ABAS DE NAVEGAÇÃO ENTRE ENTRAR E CADASTRAR */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6">
            <button type="button" onClick={() => setTab('login')} className={tab === 'login' ? TAB_ACTIVE : TAB_IDLE}>
              <i className="fa-solid fa-right-to-bracket mr-1"></i> Entrar
            </button>
            <button type="button" onClick={() => setTab('cadastro')} className={tab === 'cadastro' ? TAB_ACTIVE : TAB_IDLE}>
              <i className="fa-solid fa-user-plus mr-1"></i> Cadastrar-se
            </button>
          </div>

          {/* FORMULÁRIO DE LOGIN */}
          {tab === 'login' && (
            <form onSubmit={fazerLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-400 mb-1">E-mail *</label>
                <input
                  type="email"
                  id="login-email"
                  required
                  autoComplete="email"
                  placeholder="seuemail@exemplo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={INPUT_LOGIN}
                />
              </div>
              <div>
                <label htmlFor="login-senha" className="block text-xs font-medium text-slate-400 mb-1">Senha *</label>
                <input
                  type="password"
                  id="login-senha"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  className={INPUT_LOGIN}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-60"
              >
                {busy ? 'Entrando...' : 'Acessar Conta'}
              </button>
              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-500">
                  Ainda não possui conta?{' '}
                  <button type="button" onClick={() => setTab('cadastro')} className="text-emerald-400 hover:underline font-semibold">
                    Cadastre-se grátis
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORMULÁRIO DE CADASTRO */}
          {tab === 'cadastro' && (
            <form onSubmit={cadastrarUsuario} className="space-y-3">
              <div>
                <label htmlFor="cad-nome" className="block text-xs font-medium text-slate-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  id="cad-nome"
                  required
                  autoComplete="name"
                  placeholder="Seu Nome"
                  value={cadNome}
                  onChange={(e) => setCadNome(e.target.value)}
                  className={INPUT_CADASTRO}
                />
              </div>
              <div>
                <label htmlFor="cad-email" className="block text-xs font-medium text-slate-400 mb-1">E-mail *</label>
                <input
                  type="email"
                  id="cad-email"
                  required
                  autoComplete="email"
                  placeholder="seuemail@exemplo.com"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                  className={INPUT_CADASTRO}
                />
              </div>
              <div>
                <label htmlFor="cad-senha" className="block text-xs font-medium text-slate-400 mb-1">Senha *</label>
                <input
                  type="password"
                  id="cad-senha"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={cadSenha}
                  onChange={(e) => setCadSenha(e.target.value)}
                  className={INPUT_CADASTRO}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 mt-2 disabled:opacity-60"
              >
                {busy ? 'Criando...' : 'Criar Minha Conta'}
              </button>
              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-500">
                  Já tem uma conta?{' '}
                  <button type="button" onClick={() => setTab('login')} className="text-emerald-400 hover:underline font-semibold">
                    Fazer login
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TELA DE BOAS-VINDAS APÓS O LOGIN (COM A OPÇÃO "VER COMUNIMAP") */}
      {status === 'authenticated' && user && (
        <div
          id="welcome-card"
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-5 my-auto"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 text-3xl">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Login Realizado!</h2>
            <p className="text-sm font-semibold text-emerald-400 mt-1">Olá, {user.name}!</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Você está conectado. Clique no botão abaixo para explorar os pontos, alertas de perigo e doações
              comunitárias de Três Lagoas.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={onEnter}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95"
            >
              <i className="fa-solid fa-map-marked-alt text-lg"></i>
              <span>Ver ComuniMap</span>
            </button>
            <button
              type="button"
              onClick={sair}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs border border-slate-700 transition"
            >
              <i className="fa-solid fa-arrow-right-from-bracket mr-1"></i> Sair / Trocar Conta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
