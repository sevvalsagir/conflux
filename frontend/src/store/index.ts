import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Project, Baseline, ChangeRequest, DriftData, Notification, Message, Meeting, ActivityLog } from '../types'
import { authApi, projectsApi, baselineApi, crApi, driftApi, notificationsApi, messagesApi, meetingsApi, activityApi } from '../api'

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

// ─── Notification Store ───────────────────────────────────────────────────────

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const res = await notificationsApi.list()
    set({
      notifications: res.data,
      unreadCount: res.data.filter(n => !n.is_read).length,
    })
  },

  fetchUnreadCount: async () => {
    const res = await notificationsApi.count()
    set({ unreadCount: res.data.unread_count })
  },

  markRead: async (id) => {
    await notificationsApi.markRead(id)
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllRead: async () => {
    await notificationsApi.markAllRead()
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },
}))

// ─── Chat Store ───────────────────────────────────────────────────────────────

interface ChatState {
  messages: Message[]
  fetchMessages: (projectId: number, recipientId?: number) => Promise<void>
  sendMessage: (projectId: number, text: string, recipientId?: number) => Promise<void>
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  fetchMessages: async (projectId, recipientId) => {
    const res = await messagesApi.list(projectId, recipientId)
    set({ messages: res.data })
  },

  sendMessage: async (projectId, text, recipientId) => {
    const res = await messagesApi.send(projectId, text, recipientId)
    set(state => ({ messages: [...state.messages, res.data] }))
  },
}))

// ─── Meetings Store ───────────────────────────────────────────────────────────

interface MeetingState {
  meetings: Meeting[]
  fetchMeetings: (projectId: number) => Promise<void>
  createMeeting: (projectId: number, data: Parameters<typeof meetingsApi.create>[1]) => Promise<void>
  updateMeeting: (projectId: number, id: number, data: Parameters<typeof meetingsApi.update>[2]) => Promise<void>
  deleteMeeting: (projectId: number, id: number) => Promise<void>
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meetings: [],

  fetchMeetings: async (projectId) => {
    const res = await meetingsApi.list(projectId)
    set({ meetings: res.data })
  },

  createMeeting: async (projectId, data) => {
    const res = await meetingsApi.create(projectId, data)
    set(state => ({ meetings: [...state.meetings, res.data].sort((a, b) =>
      a.meeting_date.localeCompare(b.meeting_date)) }))
  },

  updateMeeting: async (projectId, id, data) => {
    const res = await meetingsApi.update(projectId, id, data)
    set(state => ({ meetings: state.meetings.map(m => m.id === id ? res.data : m) }))
  },

  deleteMeeting: async (projectId, id) => {
    await meetingsApi.delete(projectId, id)
    set(state => ({ meetings: state.meetings.filter(m => m.id !== id) }))
  },
}))

// ─── Activity Store ───────────────────────────────────────────────────────────

interface ActivityState {
  logs: ActivityLog[]
  fetchActivity: (projectId: number) => Promise<void>
}

export const useActivityStore = create<ActivityState>((set) => ({
  logs: [],

  fetchActivity: async (projectId) => {
    const res = await activityApi.list(projectId)
    set({ logs: res.data })
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
