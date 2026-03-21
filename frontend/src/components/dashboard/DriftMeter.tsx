import type { DriftData } from '../../types'
import { DriftLevelBadge } from '../ui/Badge'

interface DriftMeterProps {
  drift: DriftData
}

// Draws an arc-based gauge using SVG
function ArcGauge({ value, color }: { value: number; color: string }) {
  const radius = 54
  const cx = 64
  const cy = 64
  const startAngle = 210
  const endAngle = 330  // total sweep = 300 degrees

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const sweep = (value / 100) * 300

  const describeArc = (start: number, end: number) => {
    const s = { x: cx + radius * Math.cos(toRad(start)), y: cy + radius * Math.sin(toRad(start)) }
    const e = { x: cx + radius * Math.cos(toRad(start + end)), y: cy + radius * Math.sin(toRad(start + end)) }
    const large = end > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <svg viewBox="0 0 128 100" className="w-full max-w-[160px]">
      {/* Background track */}
      <path d={describeArc(startAngle, 300)} fill="none" stroke="#2e2e2e" strokeWidth="10" strokeLinecap="round" />
      {/* Value arc */}
      <path d={describeArc(startAngle, sweep)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      {/* Percentage text */}
      <text x="64" y="68" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">
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
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Scope Drift</h3>
        <DriftLevelBadge level={drift.drift_level} />
      </div>

      <div className="flex items-center gap-4">
        <div className="w-40 shrink-0">
          <ArcGauge value={drift.overall_drift} color={color} />
        </div>
        <div className="flex flex-col gap-2 flex-1">
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
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value.toFixed(1)}%</span>
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
