import { NavLink, useParams } from 'react-router-dom'
import { clsx } from 'clsx'

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
    to: (id: string) => `/projects/${id}/members`,
    label: 'Team',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const { projectId } = useParams<{ projectId: string }>()

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
                'flex items-center justify-center p-2.5 rounded-xl transition-all duration-150',
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

      {/* Back to projects at bottom */}
      <div className="mt-auto px-2 w-full">
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
