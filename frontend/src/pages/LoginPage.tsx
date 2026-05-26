import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const DEMO_ACCOUNTS = [
  {
    role: 'Project Manager',
    name: 'Alex Chen',
    email: 'manager@conflux.demo',
    password: 'demo1234',
    description: 'Lock baseline, review & decide on CRs, manage team',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    badge: 'bg-emerald-500/15 text-emerald-500',
  },
  {
    role: 'Project Member',
    name: 'Jamie Park',
    email: 'member@conflux.demo',
    password: 'demo1234',
    description: 'Submit change requests, add comments, view roadmap',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    badge: 'bg-blue-500/15 text-blue-400',
  },
  {
    role: 'Stakeholder',
    name: 'Sam Rivera',
    email: 'stakeholder@conflux.demo',
    password: 'demo1234',
    description: 'Monitor project health, drift score, and CR status',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.25)',
    badge: 'bg-violet-500/15 text-violet-400',
  },
]

export function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuthStore()
  const navigate  = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/projects')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loginAs = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setError('')
    setLoading(true)
    setEmail(acc.email)
    setPassword(acc.password)
    try {
      await login(acc.email, acc.password)
      navigate('/projects')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Demo login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left: Demo accounts ──────────────────────────────────────── */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Try the demo
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Click any account to log in instantly
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                onClick={() => loginAs(acc)}
                disabled={loading}
                className="w-full text-left rounded-xl p-4 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                style={{
                  background: acc.bg,
                  border: `1px solid ${acc.border}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: acc.color }}
                    >
                      {acc.name.split(' ').map(p => p[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                        {acc.name}
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-px rounded-full ${acc.badge}`}>
                        {acc.role}
                      </span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {acc.description}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[11px] text-gray-400 font-mono">{acc.email}</span>
                </div>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 mt-3 text-center">
            All demo accounts share password{' '}
            <span className="font-mono bg-gray-100 dark:bg-bg-elevated px-1.5 py-0.5 rounded">demo1234</span>
          </p>
        </div>

        {/* ── Right: Login form ─────────────────────────────────────────── */}
        <div className="w-full lg:flex-1">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent-green flex items-center justify-center">
              <span className="text-black font-bold text-sm">CX</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conflux</h1>
              <p className="text-xs text-slate-500 dark:text-gray-400">Scope management platform</p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Welcome back</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Sign in to your account</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-1">
                Sign In
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-gray-400 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-green hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
