import { clsx } from 'clsx'
import type { CRStatus, DriftLevel } from '../../types'

interface BadgeProps {
  label: string
  color?: 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gray' | 'cyan' | 'yellow'
  className?: string
}

export function Badge({ label, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-accent-green/20 text-accent-green': color === 'green',
          'bg-accent-orange/20 text-accent-orange': color === 'orange',
          'bg-red-500/20 text-red-400': color === 'red',
          'bg-blue-500/20 text-blue-400': color === 'blue',
          'bg-purple-500/20 text-purple-400': color === 'purple',
          'bg-gray-500/20 text-gray-400': color === 'gray',
          'bg-cyan-500/20 text-cyan-400': color === 'cyan',
          'bg-yellow-500/20 text-yellow-400': color === 'yellow',
        },
        className
      )}
    >
      {label}
    </span>
  )
}

const CR_STATUS_CONFIG: Record<CRStatus, { label: string; color: BadgeProps['color'] }> = {
  draft:        { label: 'Draft',        color: 'gray'   },
  submitted:    { label: 'Submitted',    color: 'blue'   },
  analyzing:    { label: 'Analyzing…',   color: 'purple' },
  under_review: { label: 'Under Review', color: 'yellow' },
  approved:     { label: 'Approved',     color: 'green'  },
  rejected:     { label: 'Rejected',     color: 'red'    },
  deferred:     { label: 'Deferred',     color: 'orange' },
  in_progress:  { label: 'In Progress',  color: 'cyan'   },
  done:         { label: 'Done',         color: 'green'  },
}

export function CRStatusBadge({ status }: { status: CRStatus }) {
  const config = CR_STATUS_CONFIG[status]
  return <Badge label={config.label} color={config.color} />
}

const DRIFT_CONFIG: Record<DriftLevel, { color: string }> = {
  Low:      { color: 'text-accent-green' },
  Moderate: { color: 'text-yellow-400'   },
  High:     { color: 'text-accent-orange'},
  Critical: { color: 'text-red-400'      },
}

export function DriftLevelBadge({ level }: { level: DriftLevel }) {
  return (
    <span className={clsx('font-semibold', DRIFT_CONFIG[level].color)}>
      {level}
    </span>
  )
}
