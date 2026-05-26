import { useEffect } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { useNotificationStore, useAuthStore } from '../../store'

const navItems = [
  {
    to: (id: string) => `/projects/${id}/dashboard`,
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: (id: string) => `/projects/${id}/baseline`,
    label: 'Baseline',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: (id: string) => `/projects/${id}/change-requests`,
    label: 'Change Requests',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    to: (id: string) => `/projects/${id}/roadmap`,
    label: 'Roadmap',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: (id: string) => `/projects/${id}/chat`,
    label: 'Chat',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    to: (id: string) => `/projects/${id}/meetings`,
    label: 'Meetings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: (id: string) => `/projects/${id}/members`,
    label: 'Team',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm pointer-events-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const { token } = useAuthStore()
  const { unreadCount, fetchUnreadCount } = useNotificationStore()

  // Poll notification count every 30 s
  useEffect(() => {
    if (!token) return
    fetchUnreadCount()
    const t = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(t)
  }, [token])

  return (
    <aside className="w-16 flex flex-col items-center py-6 gap-2 bg-white dark:bg-bg-card border-r border-slate-200 dark:border-bg-border shrink-0">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-accent-green flex items-center justify-center mb-4">
        <span className="text-black font-bold text-sm">CX</span>
      </div>

      <div className="flex flex-col gap-1 w-full px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={projectId ? item.to(projectId) : '/projects'}
            title={item.label}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center justify-center p-2.5 rounded-xl transition-all duration-150',
                isActive
                  ? 'bg-accent-green/20 text-accent-green'
                  : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-bg-elevated'
              )
            }
          >
            {item.icon}
          </NavLink>
        ))}
      </div>

      {/* Notification bell + back-to-projects at bottom */}
      <div className="mt-auto px-2 w-full flex flex-col gap-1">
        <NavLink
          to={projectId ? `/projects/${projectId}/notifications` : '/projects'}
          title="Notifications"
          className={({ isActive }) =>
            clsx(
              'relative flex items-center justify-center p-2.5 rounded-xl transition-all duration-150',
              isActive
                ? 'bg-accent-green/20 text-accent-green'
                : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-bg-elevated'
            )
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <Badge count={unreadCount} />
        </NavLink>

        <NavLink
          to="/projects"
          title="All Projects"
          className="flex items-center justify-center p-2.5 rounded-xl text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-bg-elevated transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </NavLink>
      </div>
    </aside>
  )
}
