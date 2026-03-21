import { clsx } from 'clsx'
import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  accent?: 'green' | 'orange' | 'blue' | 'red'
  icon: ReactNode
}

const accentMap = {
  green:  'text-accent-green bg-accent-green/10',
  orange: 'text-accent-orange bg-accent-orange/10',
  blue:   'text-blue-400 bg-blue-500/10',
  red:    'text-red-400 bg-red-500/10',
}

export function StatsCard({ title, value, subtitle, accent = 'green', icon }: StatsCardProps) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', accentMap[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{title}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
