import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProjectStore, useBaselineStore, useCRStore } from '../store'
import { AppLayout } from '../components/layout/AppLayout'
import { PageSpinner } from '../components/ui/Spinner'
import type { Feature, FeatureStatus, ChangeRequest, ProjectMember } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoadmapItem {
  id: number
  name: string
  description: string
  effort_days: number
  status: FeatureStatus
  startDate: Date
  endDate: Date
  isFromCR: boolean
  crId?: number
  assignedMembers: ProjectMember[]
  lane: number // 0 or 1 — two parallel lanes
}

interface MilestoneMarker {
  id: number
  name: string
  date: Date
  is_completed: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 1000 * 60 * 60 * 24
const LEFT_PANEL_W = 272

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatMonth(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function formatDay(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

const MEMBER_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
]

function memberColor(userId: number) {
  return MEMBER_COLORS[userId % MEMBER_COLORS.length]
}

// Compute roadmap item dates from project start
function buildRoadmapItems(
  features: Feature[],
  approvedCRs: ChangeRequest[],
  members: ProjectMember[],
  projectStart: Date,
): RoadmapItem[] {
  // Sort: completed → in_progress → planned → removed
  const statusOrder: Record<FeatureStatus, number> = {
    completed: 0, in_progress: 1, planned: 2, removed: 3,
  }
  const sorted = [...features].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  // Two parallel lanes
  const laneEnd = [new Date(projectStart), new Date(projectStart)]
  const items: RoadmapItem[] = []

  sorted.forEach((f, i) => {
    const lane = i % 2
    const otherLane = 1 - lane

    // Start at the earlier available lane position
    let start = new Date(Math.min(laneEnd[lane].getTime(), laneEnd[otherLane].getTime() + DAY_MS * 3))
    if (start < projectStart) start = new Date(projectStart)

    // Completed/in_progress: anchor to realistic past/present dates
    if (f.status === 'completed') {
      // already done — don't go past today minus a buffer
    } else if (f.status === 'in_progress') {
      // Make sure it started recently and ends in the future
      const today = new Date()
      if (start > today) start = addDays(today, -Math.floor(f.effort_days * 0.4))
    }

    const end = addDays(start, f.effort_days)
    laneEnd[lane] = addDays(end, 2) // 2 day gap

    // Assign members round-robin, 1–2 per feature
    const memberCount = members.length
    const assigned: ProjectMember[] = []
    if (memberCount > 0) assigned.push(members[i % memberCount])
    if (memberCount > 1 && f.effort_days > 10) assigned.push(members[(i + 1) % memberCount])

    items.push({
      id: f.id,
      name: f.name,
      description: f.description,
      effort_days: f.effort_days,
      status: f.status,
      startDate: start,
      endDate: end,
      isFromCR: false,
      assignedMembers: assigned,
      lane,
    })
  })

  // Approved CR feature_add → extra items, clearly after baseline
  approvedCRs
    .filter(cr => cr.cr_type === 'feature_add')
    .forEach((cr, i) => {
      const lane = i % 2
      const refDate = cr.decided_at ? new Date(cr.decided_at) : new Date()
      const start = addDays(refDate, 5)
      const effort = cr.ai_analysis ? 10 : 8
      const end = addDays(start, effort)
      const assigned: ProjectMember[] = members.length > 0 ? [members[i % members.length]] : []
      items.push({
        id: -cr.id,
        name: cr.title,
        description: cr.description,
        effort_days: effort,
        status: 'planned',
        startDate: start,
        endDate: end,
        isFromCR: true,
        crId: cr.id,
        assignedMembers: assigned,
        lane: 1 - (lane % 2), // opposite lane from baseline
      })
    })

  return items
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: FeatureStatus }) {
  const map: Record<FeatureStatus, string> = {
    completed: 'bg-emerald-400',
    in_progress: 'bg-blue-400 animate-pulse',
    planned: 'bg-gray-500',
    removed: 'bg-red-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status]}`} />
}

function AvatarStack({ members }: { members: ProjectMember[] }) {
  return (
    <div className="flex -space-x-1.5">
      {members.slice(0, 3).map(m => (
        <div
          key={m.user_id}
          title={m.user.name}
          className={`w-5 h-5 rounded-full ${memberColor(m.user_id)} flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-bg-card`}
        >
          {initials(m.user.name)}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RoadmapPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)

  const { currentProject, fetchProject } = useProjectStore()
  const { baseline, fetchBaseline } = useBaselineStore()
  const { crs, fetchCRs } = useCRStore()
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | FeatureStatus>('all')
  const [filterMember, setFilterMember] = useState<'all' | number>('all')
  const [filterType, setFilterType] = useState<'all' | 'baseline' | 'cr'>('all')
  const [zoom, setZoom] = useState<'month' | 'week'>(  'month')
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  // Scroll sync
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchProject(id), fetchBaseline(id), fetchCRs(id)])
      .finally(() => setLoading(false))
  }, [id])

  // Sync horizontal scroll between header and body
  const onBodyScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current)
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft
  }

  const DAY_W = zoom === 'week' ? 48 : 24

  // Build roadmap items
  const { items, milestones, viewStart, viewEnd, totalDays } = useMemo(() => {
    if (!baseline) return { items: [], milestones: [], viewStart: new Date(), viewEnd: new Date(), totalDays: 60 }

    const projectStart = baseline.locked_at
      ? new Date(baseline.locked_at)
      : new Date(baseline.created_at)

    const approvedCRs = crs.filter(cr => cr.status === 'approved')
    const members = currentProject?.members ?? []

    const rawItems = buildRoadmapItems(baseline.features, approvedCRs, members, projectStart)

    // View window: 2 weeks before earliest start → 3 weeks after latest end
    const allDates = rawItems.flatMap(i => [i.startDate, i.endDate])
    const milestonesDates = baseline.milestones.map(m => new Date(m.due_date))
    const allPoints = [...allDates, ...milestonesDates, new Date()]

    const earliest = new Date(Math.min(...allPoints.map(d => d.getTime())))
    const latest = new Date(Math.max(...allPoints.map(d => d.getTime())))

    const viewStart = addDays(earliest, -14)
    const viewEnd = addDays(latest, 21)
    const totalDays = daysBetween(viewStart, viewEnd)

    const milestones: MilestoneMarker[] = baseline.milestones.map(m => ({
      id: m.id,
      name: m.name,
      date: new Date(m.due_date),
      is_completed: m.is_completed,
    }))

    return { items: rawItems, milestones, viewStart, viewEnd, totalDays }
  }, [baseline, crs, currentProject])

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      if (filterType === 'baseline' && item.isFromCR) return false
      if (filterType === 'cr' && !item.isFromCR) return false
      if (filterMember !== 'all') {
        if (!item.assignedMembers.some(m => m.user_id === filterMember)) return false
      }
      return true
    })
  }, [items, filterStatus, filterMember, filterType])

  // Column headers (months or weeks)
  const columnHeaders = useMemo(() => {
    const headers: { label: string; startDay: number; width: number }[] = []
    if (zoom === 'month') {
      let cur = new Date(viewStart)
      cur.setDate(1)
      while (cur <= viewEnd) {
        const monthStart = new Date(cur)
        const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
        const clampedStart = monthStart < viewStart ? viewStart : monthStart
        const clampedEnd = nextMonth > viewEnd ? viewEnd : nextMonth
        const startDay = daysBetween(viewStart, clampedStart)
        const days = daysBetween(clampedStart, clampedEnd)
        headers.push({ label: formatMonth(monthStart), startDay, width: days * DAY_W })
        cur = nextMonth
      }
    } else {
      // weeks
      for (let d = 0; d < totalDays; d += 7) {
        const weekStart = addDays(viewStart, d)
        const days = Math.min(7, totalDays - d)
        headers.push({ label: formatDay(weekStart), startDay: d, width: days * DAY_W })
      }
    }
    return headers
  }, [viewStart, viewEnd, zoom, totalDays, DAY_W])

  const todayOffset = daysBetween(viewStart, new Date()) * DAY_W

  const getBarStyle = (item: RoadmapItem) => {
    const left = daysBetween(viewStart, item.startDate) * DAY_W
    const width = Math.max(item.effort_days * DAY_W, 40)
    return { left, width }
  }

  const getMilestoneOffset = (m: MilestoneMarker) =>
    daysBetween(viewStart, m.date) * DAY_W

  const barColor = (item: RoadmapItem) => {
    if (item.isFromCR) {
      return item.status === 'completed'
        ? 'bg-amber-500/80 border border-amber-400'
        : 'bg-amber-500/30 border border-amber-400/60 border-dashed'
    }
    if (item.status === 'completed') return 'bg-emerald-500/80 border border-emerald-400'
    if (item.status === 'in_progress') return 'bg-blue-500/60 border border-blue-400'
    if (item.status === 'removed') return 'bg-red-900/40 border border-red-700/50 line-through'
    return 'bg-gray-600/50 border border-gray-500/60'
  }

  if (loading) return <AppLayout title="Roadmap"><PageSpinner /></AppLayout>
  if (!baseline) return (
    <AppLayout title="Roadmap">
      <div className="text-center py-20 text-gray-400">
        <p>No baseline found. Set up the baseline first.</p>
      </div>
    </AppLayout>
  )

  const members = currentProject?.members ?? []

  return (
    <AppLayout
      title={currentProject?.name ?? 'Roadmap'}
      subtitle="Project Roadmap"
    >
      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Status filter */}
        <div className="flex items-center gap-1 bg-bg-card border border-bg-border rounded-xl p-1">
          {(['all', 'completed', 'in_progress', 'planned'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === s
                  ? 'bg-accent-green text-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-bg-card border border-bg-border rounded-xl p-1">
          {(['all', 'baseline', 'cr'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === t
                  ? 'bg-accent-green text-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'all' ? 'All Types' : t === 'baseline' ? '⬛ Baseline' : '🔶 CR Added'}
            </button>
          ))}
        </div>

        {/* Member filter */}
        <div className="flex items-center gap-1.5 bg-bg-card border border-bg-border rounded-xl px-2 py-1">
          <span className="text-xs text-gray-500">Member:</span>
          <select
            value={filterMember}
            onChange={e => setFilterMember(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-transparent text-xs text-gray-300 outline-none cursor-pointer"
          >
            <option value="all">All</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.user.name}</option>
            ))}
          </select>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-bg-card border border-bg-border rounded-xl p-1 ml-auto">
          <button
            onClick={() => setZoom('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${zoom === 'month' ? 'bg-accent-green text-black' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Month
          </button>
          <button
            onClick={() => setZoom('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${zoom === 'week' ? 'bg-accent-green text-black' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Week
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pl-2 border-l border-bg-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/80 border border-emerald-400" />
            <span className="text-xs text-gray-400">Baseline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-400/60 border-dashed" />
            <span className="text-xs text-gray-400">CR Added</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-4 bg-red-500/70 rounded" />
            <span className="text-xs text-gray-400">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-base leading-none">◆</span>
            <span className="text-xs text-gray-400">Milestone</span>
          </div>
        </div>
      </div>

      {/* ── Team members bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 bg-bg-card border border-bg-border rounded-xl px-4 py-3">
        <span className="text-xs text-gray-500 font-medium shrink-0">TEAM</span>
        <div className="flex items-center gap-2 flex-wrap">
          {members.map(m => (
            <button
              key={m.user_id}
              onClick={() => setFilterMember(filterMember === m.user_id ? 'all' : m.user_id)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                filterMember === m.user_id
                  ? 'border-accent-green bg-accent-green/10 text-accent-green'
                  : 'border-bg-border text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full ${memberColor(m.user_id)} flex items-center justify-center text-[9px] font-bold text-white`}>
                {initials(m.user.name)}
              </div>
              <span>{m.user.name}</span>
              <span className={`text-[10px] px-1 rounded ${
                m.role === 'manager' ? 'bg-accent-green/20 text-accent-green' :
                m.role === 'stakeholder' ? 'bg-gray-700 text-gray-400' :
                'bg-blue-900/40 text-blue-400'
              }`}>
                {m.role}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Gantt Chart ──────────────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
        {/* Month/week header */}
        <div className="flex border-b border-bg-border">
          {/* Left panel header */}
          <div
            className="shrink-0 border-r border-bg-border bg-bg-elevated px-4 py-2 flex items-center"
            style={{ width: LEFT_PANEL_W }}
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Feature</span>
          </div>
          {/* Scrollable header */}
          <div
            ref={headerScrollRef}
            className="flex-1 overflow-hidden"
            style={{ overflowX: 'hidden' }}
          >
            <div className="relative" style={{ width: totalDays * DAY_W, height: 36 }}>
              {columnHeaders.map((col, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center border-r border-bg-border/50 px-2"
                  style={{ left: col.startDay * DAY_W, width: col.width }}
                >
                  <span className="text-xs text-gray-500 font-medium truncate">{col.label}</span>
                </div>
              ))}
              {/* Today line in header */}
              {todayOffset >= 0 && todayOffset <= totalDays * DAY_W && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500/60"
                  style={{ left: todayOffset }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          ref={bodyScrollRef}
          className="flex overflow-x-auto"
          onScroll={onBodyScroll}
          style={{ maxHeight: '65vh' }}
        >
          {/* Left panel — sticky */}
          <div
            className="shrink-0 border-r border-bg-border"
            style={{ width: LEFT_PANEL_W, position: 'sticky', left: 0, zIndex: 10 }}
          >
            {filteredItems.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-4 py-0 border-b border-bg-border/50 transition-colors ${
                  hoveredId === item.id ? 'bg-bg-elevated' : idx % 2 === 0 ? 'bg-bg-card' : 'bg-bg-base/40'
                }`}
                style={{ height: 52 }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <StatusDot status={item.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-200 truncate">{item.name}</span>
                    {item.isFromCR && (
                      <span className="shrink-0 text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded">CR</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {item.effort_days}d · {formatDay(item.startDate)} – {formatDay(item.endDate)}
                  </div>
                </div>
                <AvatarStack members={item.assignedMembers} />
              </div>
            ))}

            {/* Milestone rows */}
            {milestones.length > 0 && (
              <div className="border-t border-bg-border/80 mt-0">
                <div
                  className="px-4 flex items-center bg-bg-elevated/60"
                  style={{ height: 32 }}
                >
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Milestones</span>
                </div>
                {milestones.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-4 border-b border-bg-border/50 bg-bg-card"
                    style={{ height: 44 }}
                  >
                    <span className={`text-sm ${m.is_completed ? 'text-emerald-400' : 'text-amber-400'}`}>◆</span>
                    <div>
                      <div className="text-xs font-medium text-gray-300 truncate" style={{ maxWidth: 180 }}>{m.name}</div>
                      <div className="text-[10px] text-gray-500">{formatDay(m.date)}</div>
                    </div>
                    {m.is_completed && (
                      <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded">Done</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No features match the filters
              </div>
            )}
          </div>

          {/* Right — Gantt bars area */}
          <div className="flex-1 relative" style={{ minWidth: totalDays * DAY_W }}>
            {/* Vertical grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {columnHeaders.map((col, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-bg-border/30"
                  style={{ left: col.startDay * DAY_W }}
                />
              ))}
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays * DAY_W && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10"
                  style={{ left: todayOffset }}
                >
                  <div className="absolute -top-0 left-1 text-[9px] text-red-400 font-semibold whitespace-nowrap bg-bg-card px-1 rounded">
                    TODAY
                  </div>
                </div>
              )}
            </div>

            {/* Feature rows */}
            {filteredItems.map((item, idx) => {
              const { left, width } = getBarStyle(item)
              const isHovered = hoveredId === item.id
              return (
                <div
                  key={item.id}
                  className={`relative flex items-center border-b border-bg-border/50 ${
                    isHovered ? 'bg-bg-elevated/40' : idx % 2 === 0 ? '' : 'bg-bg-base/20'
                  }`}
                  style={{ height: 52 }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Bar */}
                  <div
                    className={`absolute h-7 rounded-lg flex items-center px-2 gap-1.5 transition-all group cursor-default ${barColor(item)} ${
                      isHovered ? 'shadow-lg brightness-110' : ''
                    }`}
                    style={{ left, width, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {/* Progress fill for in_progress */}
                    {item.status === 'in_progress' && (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-blue-400/20 rounded-lg"
                          style={{ width: '45%' }}
                        />
                      </div>
                    )}

                    {/* Bar content */}
                    <span className="relative text-[10px] font-medium text-white/90 truncate flex-1 select-none">
                      {item.name}
                    </span>
                    <div className="relative flex -space-x-1 shrink-0">
                      {item.assignedMembers.slice(0, 2).map(m => (
                        <div
                          key={m.user_id}
                          title={m.user.name}
                          className={`w-4 h-4 rounded-full ${memberColor(m.user_id)} flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-bg-card`}
                        >
                          {initials(m.user.name)}
                        </div>
                      ))}
                    </div>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div
                        className="absolute z-50 bg-bg-elevated border border-bg-border rounded-xl p-3 shadow-2xl pointer-events-none"
                        style={{
                          top: '110%',
                          left: 0,
                          minWidth: 240,
                          maxWidth: 300,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-gray-100">{item.name}</span>
                          {item.isFromCR && (
                            <Link
                              to={`/projects/${id}/change-requests/${Math.abs(item.crId ?? 0)}`}
                              className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded hover:bg-amber-500/30 transition-colors shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              View CR →
                            </Link>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{item.description}</p>
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <span className="text-gray-500">⏱ {item.effort_days} days</span>
                          <span className="text-gray-500">📅 {formatDay(item.startDate)} → {formatDay(item.endDate)}</span>
                        </div>
                        {item.assignedMembers.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-bg-border">
                            <span className="text-[10px] text-gray-500">Assigned: </span>
                            <span className="text-[10px] text-gray-300">
                              {item.assignedMembers.map(m => m.user.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Milestone rows */}
            {milestones.length > 0 && (
              <>
                <div
                  className="relative border-t border-bg-border/80 bg-bg-elevated/30"
                  style={{ height: 32 }}
                />
                {milestones.map(m => {
                  const offset = getMilestoneOffset(m)
                  return (
                    <div
                      key={m.id}
                      className="relative border-b border-bg-border/50 bg-bg-card"
                      style={{ height: 44 }}
                    >
                      {/* Diamond marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                        style={{ left: offset }}
                      >
                        <span
                          className={`text-xl leading-none ${m.is_completed ? 'text-emerald-400' : 'text-amber-400'}`}
                        >
                          ◆
                        </span>
                        {/* Vertical dashed drop line */}
                        <div
                          className="absolute bottom-full w-px border-l border-dashed border-gray-600/50"
                          style={{ height: filteredItems.length * 52 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Features', value: filteredItems.filter(i => !i.isFromCR).length, color: 'text-gray-200' },
          { label: 'CR Added', value: filteredItems.filter(i => i.isFromCR).length, color: 'text-amber-400' },
          { label: 'Completed', value: filteredItems.filter(i => i.status === 'completed').length, color: 'text-emerald-400' },
          { label: 'In Progress', value: filteredItems.filter(i => i.status === 'in_progress').length, color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-card border border-bg-border rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">{stat.label}</span>
            <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
