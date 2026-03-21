import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore, useBaselineStore, useCRStore, useDriftStore } from '../store'
import { AppLayout } from '../components/layout/AppLayout'
import { StatsCard } from '../components/dashboard/StatsCard'
import { DriftMeter } from '../components/dashboard/DriftMeter'
import { CRChart } from '../components/dashboard/CRChart'
import { MilestoneTimeline } from '../components/dashboard/MilestoneTimeline'
import { RecentCRs } from '../components/dashboard/RecentCRs'
import { PageSpinner } from '../components/ui/Spinner'

export function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)

  const { currentProject, fetchProject } = useProjectStore()
  const { baseline, fetchBaseline } = useBaselineStore()
  const { crs, fetchCRs } = useCRStore()
  const { drift, fetchDrift } = useDriftStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchProject(id),
      fetchBaseline(id),
      fetchCRs(id),
      fetchDrift(id),
    ]).finally(() => setLoading(false))
  }, [id])

  if (loading) return <AppLayout title="Dashboard"><PageSpinner /></AppLayout>

  const totalFeatures = baseline?.features.length ?? 0
  const completedFeatures = baseline?.features.filter(f => f.status === 'completed').length ?? 0
  const pendingCRs = crs.filter(cr =>
    ['submitted', 'analyzing', 'under_review'].includes(cr.status)
  ).length

  return (
    <AppLayout
      title={currentProject?.name ?? 'Dashboard'}
      subtitle="Project Overview"
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Features"
          value={totalFeatures}
          subtitle={`${completedFeatures} completed`}
          accent="green"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
        <StatsCard
          title="Change Requests"
          value={drift?.total_crs ?? 0}
          subtitle={`${pendingCRs} pending`}
          accent="orange"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
        />
        <StatsCard
          title="Team Size"
          value={currentProject?.members.length ?? 0}
          subtitle="members"
          accent="blue"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatsCard
          title="Baseline"
          value={baseline?.is_locked ? 'Locked' : 'Draft'}
          subtitle={baseline?.is_locked ? 'Changes via CR only' : 'Not locked yet'}
          accent={baseline?.is_locked ? 'green' : 'orange'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={baseline?.is_locked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"} /></svg>}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          {drift ? <DriftMeter drift={drift} /> : null}
        </div>
        <div>
          {drift ? <CRChart drift={drift} /> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentCRs crs={crs} projectId={id} />
        <MilestoneTimeline milestones={baseline?.milestones ?? []} />
      </div>
    </AppLayout>
  )
}
