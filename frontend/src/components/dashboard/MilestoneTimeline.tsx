import type { Milestone } from '../../types'
import { fmtDate } from '../../utils/time'

interface MilestoneTimelineProps {
  milestones: Milestone[]
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  const sorted = [...milestones].sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Milestones</h3>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">No milestones defined.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((m, i) => {
            const isOverdue = !m.is_completed && new Date(m.due_date + 'T23:59:59') < new Date()
            return (
              <div key={m.id} className="flex items-start gap-3">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center shrink-0 mt-1">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      m.is_completed
                        ? 'bg-accent-green border-accent-green'
                        : isOverdue
                        ? 'bg-transparent border-red-400'
                        : 'bg-transparent border-gray-500'
                    }`}
                  />
                  {i < sorted.length - 1 && (
                    <div className="w-px h-6 bg-bg-border mt-1" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${m.is_completed ? 'line-through text-gray-500' : 'text-white'}`}>
                    {m.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                    {fmtDate(m.due_date + 'T00:00:00')}
                    {isOverdue && ' — Overdue'}
                    {m.is_completed && ' — Completed'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
