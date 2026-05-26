import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppLayoutProps {
  title?: string
  subtitle?: string
  /** When true the main area is overflow-hidden (full-height panels like Chat/Meetings).
   *  When false/absent it scrolls with padding (most pages). */
  fullHeight?: boolean
  children: ReactNode
}

export function AppLayout({ title, subtitle, fullHeight, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-100 dark:bg-bg-base overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {title && <Header title={title} subtitle={subtitle} />}
        <main className={fullHeight ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 overflow-y-auto p-6'}>
          {children}
        </main>
      </div>
    </div>
  )
}
