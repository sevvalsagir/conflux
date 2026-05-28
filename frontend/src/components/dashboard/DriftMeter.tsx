import type { DriftData } from '../../types'
import { DriftLevelBadge } from '../ui/Badge'

interface DriftMeterProps {
  drift: DriftData
}

// Arc gauge — the arc sweeps from 210° to 150° (clockwise, 300° total).
// At its lowest point it passes through 90° where y = cy + r = 68 + 54 = 122.
// viewBox height is 130 so nothing clips.
function ArcGauge({ value, color }: { value: number; color: string }) {
  const radius = 54
  const cx = 70
  const cy = 68
  const startAngle = 210
  // total sweep = 300°

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const describeArc = (start: number, sweep: number) => {
    if (sweep <= 0) return ''
    const s = { x: cx + radius * Math.cos(toRad(start)), y: cy + radius * Math.sin(toRad(start)) }
    const e = { x: cx + radius * Math.cos(toRad(start + sweep)), y: cy + radius * Math.sin(toRad(start + sweep)) }
    const large = sweep > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const valueSweep = (value / 100) * 300

  return (
    // text-slate-800 dark:text-white → fill="currentColor" in SVG text inherits this
    <svg viewBox="0 0 140 130" className="w-full max-w-[168px] text-slate-800 dark:text-white">
      {/* Background track — uses CSS variable so it adapts to theme */}
      <path
        d={describeArc(startAngle, 300)}
        fill="none"
        stroke="var(--border)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Value arc */}
      {valueSweep > 0 && (
        <path
          d={describeArc(startAngle, valueSweep)}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />
      )}
      {/* Dot at start when value = 0 */}
      {valueSweep === 0 && (
        <circle
          cx={cx + radius * Math.cos(toRad(startAngle))}
          cy={cy + radius * Math.sin(toRad(startAngle))}
          r="6"
          fill={color}
        />
      )}
      {/* Percentage — fill="currentColor" inherits from className above */}
      <text x={cx} y={cy + 6} textAnchor="middle" fill="currentColor" fontSize="18" fontWeight="700">
        {Math.round(value)}%
      </text>
    </svg>
  )
}

function driftColor(level: string) {
  if (level === 'Low') return '#7EE787'
  if (level === 'Moderate') return '#facc15'
  if (level === 'High') return '#F5A524'
  return '#ef4444'
}

export function DriftMeter({ drift }: DriftMeterProps) {
  const color = driftColor(drift.drift_level)

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Scope Drift</h3>
        <DriftLevelBadge level={drift.drift_level} />
      </div>

      <div className="flex items-center gap-4">
        <div className="w-40 shrink-0">
          <ArcGauge value={drift.overall_drift} color={color} />
        </div>
        <div className="flex flex-col gap-3 flex-1">
          <DriftBar label="Features" value={drift.feature_drift} color={color} />
          <DriftBar label="Effort" value={drift.effort_drift} color={color} />
          <DriftBar label="Timeline" value={drift.timeline_drift} color={color} />
        </div>
      </div>
    </div>
  )
}

function DriftBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium text-slate-700 dark:text-gray-200">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
