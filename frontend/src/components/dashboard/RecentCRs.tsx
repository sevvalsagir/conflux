import { useNavigate } from 'react-router-dom'
import type { ChangeRequest } from '../../types'
import { CRStatusBadge } from '../ui/Badge'
import { timeAgoLong } from '../../utils/time'

interface RecentCRsProps {
  crs: ChangeRequest[]
  projectId: number
}

export function RecentCRs({ crs, projectId }: RecentCRsProps) {
  const navigate = useNavigate()
  const recent = crs.slice(0, 5)

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Recent Changes</h3>
        <button
          onClick={() => navigate(`/projects/${projectId}/change-requests`)}
          className="text-xs text-accent-green hover:underline"
        >
          View all
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-gray-500">No change requests yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((cr) => (
            <button
              key={cr.id}
              onClick={() => navigate(`/projects/${projectId}/change-requests/${cr.id}`)}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-elevated transition-colors text-left w-full group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-accent-green transition-colors">
                  {cr.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {timeAgoLong(cr.created_at)}
                  {' · '}{cr.submitted_by.name}
                </p>
              </div>
              <CRStatusBadge status={cr.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
