import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Project, Baseline, ChangeRequest, DriftData } from '../types'
import { authApi, projectsApi, baselineApi, crApi, driftApi } from '../api'

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (email, password) => {
    const res = await authApi.login(email, password)
    const token = res.data.access_token
    localStorage.setItem('token', token)
    set({ token })
    const me = await authApi.me()
    set({ user: me.data })
  },

  register: async (email, name, password) => {
    const res = await authApi.register(email, name, password)
    const token = res.data.access_token
    localStorage.setItem('token', token)
    set({ token })
    const me = await authApi.me()
    set({ user: me.data })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const me = await authApi.me()
      set({ user: me.data })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    } finally {
      set({ isLoading: false })
    }
  },
}))

// ─── Project Store ────────────────────────────────────────────────────────────

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  fetchProjects: () => Promise<void>
  fetchProject: (id: number) => Promise<void>
  createProject: (name: string, description: string) => Promise<Project>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,

  fetchProjects: async () => {
    const res = await projectsApi.list()
    set({ projects: res.data })
  },

  fetchProject: async (id) => {
    const res = await projectsApi.get(id)
    set({ currentProject: res.data })
  },

  createProject: async (name, description) => {
    const res = await projectsApi.create(name, description)
    set((state) => ({ projects: [res.data, ...state.projects] }))
    return res.data
  },
}))

// ─── Baseline Store ───────────────────────────────────────────────────────────

interface BaselineState {
  baseline: Baseline | null
  fetchBaseline: (projectId: number) => Promise<void>
  setBaseline: (baseline: Baseline) => void
}

export const useBaselineStore = create<BaselineState>((set) => ({
  baseline: null,

  fetchBaseline: async (projectId) => {
    const res = await baselineApi.get(projectId)
    set({ baseline: res.data })
  },

  setBaseline: (baseline) => set({ baseline }),
}))

// ─── Change Request Store ─────────────────────────────────────────────────────

interface CRState {
  crs: ChangeRequest[]
  currentCR: ChangeRequest | null
  fetchCRs: (projectId: number) => Promise<void>
  fetchCR: (projectId: number, crId: number) => Promise<void>
  addCR: (cr: ChangeRequest) => void
  updateCR: (cr: ChangeRequest) => void
}

export const useCRStore = create<CRState>((set) => ({
  crs: [],
  currentCR: null,

  fetchCRs: async (projectId) => {
    const res = await crApi.list(projectId)
    set({ crs: res.data })
  },

  fetchCR: async (projectId, crId) => {
    const res = await crApi.get(projectId, crId)
    set({ currentCR: res.data })
  },

  addCR: (cr) => set((state) => ({ crs: [cr, ...state.crs] })),

  updateCR: (updated) =>
    set((state) => ({
      crs: state.crs.map((cr) => (cr.id === updated.id ? updated : cr)),
      currentCR: state.currentCR?.id === updated.id ? updated : state.currentCR,
    })),
}))

// ─── Drift Store ──────────────────────────────────────────────────────────────

interface DriftState {
  drift: DriftData | null
  fetchDrift: (projectId: number) => Promise<void>
}

export const useDriftStore = create<DriftState>((set) => ({
  drift: null,

  fetchDrift: async (projectId) => {
    const res = await driftApi.get(projectId)
    set({ drift: res.data })
  },
}))

// ── Theme Store ────────────────────────────────────────────────────
interface ThemeState {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        if (next === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
    }),
    { name: 'conflux-theme' }
  )
)
