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
  lane: number
}

interface MilestoneMarker {
  id: number
  name: string
  date: Date
  is_completed: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 1000 * 60 * 60 * 24
const LEFT_PANEL_W = 260

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
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
  'bg-amber-500',   'bg-rose-500',  'bg-cyan-500',
]
const MEMBER_COLORS_HEX = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4',
]
function memberColor(userId: number) { return MEMBER_COLORS[userId % MEMBER_COLORS.length] }
function memberColorHex(userId: number) { return MEMBER_COLORS_HEX[userId % MEMBER_COLORS_HEX.length] }

function buildRoadmapItems(
  features: Feature[],
  approvedCRs: ChangeRequest[],
  members: ProjectMember[],
  projectStart: Date,
): RoadmapItem[] {
  const statusOrder: Record<FeatureStatus, number> = {
    completed: 0, in_progress: 1, planned: 2, removed: 3,
  }
  const sorted = [...features].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  const laneEnd = [new Date(projectStart), new Date(projectStart)]
  const items: RoadmapItem[] = []

  sorted.forEach((f, i) => {
    const lane = i % 2
    const otherLane = 1 - lane
    let start = new Date(Math.min(laneEnd[lane].getTime(), laneEnd[otherLane].getTime() + DAY_MS * 3))
    if (start < projectStart) start = new Date(projectStart)
    if (f.status === 'in_progress') {
      const today = new Date()
      if (start > today) start = addDays(today, -Math.floor(f.effort_days * 0.4))
    }
    const end = addDays(start, f.effort_days)
    laneEnd[lane] = addDays(end, 2)
    const assigned: ProjectMember[] = []
    if (members.length > 0) assigned.push(members[i % members.length])
    if (members.length > 1 && f.effort_days > 10) assigned.push(members[(i + 1) % members.length])
    items.push({ id: f.id, name: f.name, description: f.description, effort_days: f.effort_days,
      status: f.status, startDate: start, endDate: end, isFromCR: false, assignedMembers: assigned, lane })
  })

  approvedCRs.filter(cr => cr.cr_type === 'feature_add').forEach((cr, i) => {
    const lane = i % 2
    const refDate = cr.decided_at ? new Date(cr.decided_at) : new Date()
    const start = addDays(refDate, 5)
    const effort = cr.ai_analysis ? 10 : 8
    const end = addDays(start, effort)
    const assigned: ProjectMember[] = members.length > 0 ? [members[i % members.length]] : []
    items.push({ id: -cr.id, name: cr.title, description: cr.description, effort_days: effort,
      status: 'planned', startDate: start, endDate: end, isFromCR: true, crId: cr.id,
      assignedMembers: assigned, lane: 1 - (lane % 2) })
  })
  return items
}

// ─── Bar color config ─────────────────────────────────────────────────────────

function barConfig(item: RoadmapItem): { bg: string; glow: string; text: string } {
  if (item.isFromCR) return {
    bg: item.status === 'completed'
      ? 'bg-amber-500/70'
      : 'bg-amber-400/20 border border-dashed border-amber-400/50',
    glow: '0 0 12px rgba(245,158,11,0.25)',
    text: 'text-amber-200',
  }
  const map: Record<FeatureStatus, { bg: string; glow: string; text: string }> = {
    completed:  { bg: 'bg-emerald-500/75',  glow: '0 0 12px rgba(16,185,129,0.3)', text: 'text-white' },
    in_progress:{ bg: 'bg-blue-500/60',     glow: '0 0 14px rgba(59,130,246,0.35)', text: 'text-white' },
    planned:    { bg: 'bg-slate-500/40',    glow: 'none', text: 'text-slate-300 dark:text-slate-300' },
    removed:    { bg: 'bg-red-900/30 line-through', glow: 'none', text: 'text-red-400/70' },
  }
  return map[item.status]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: FeatureStatus }) {
  const map: Record<FeatureStatus, string> = {
    completed:  'bg-emerald-400',
    in_progress:'bg-blue-400 animate-pulse',
    planned:    'bg-slate-400',
    removed:    'bg-red-500',
  }
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${map[status]}`} />
}

function Avatar({ member, size = 5 }: { member: ProjectMember; size?: number }) {
  return (
    <div
      title={member.user.name}
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-white/10`}
      style={{ backgroundColor: memberColorHex(member.user_id) }}
    >
      {initials(member.user.name)}
    </div>
  )
}

function AvatarStack({ members }: { members: ProjectMember[] }) {
  return (
    <div className="flex -space-x-1.5">
      {members.slice(0, 3).map(m => <Avatar key={m.user_id} member={m} size={5} />)}
    </div>
  )
}

// ─── Filter pill group ────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options, value, onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-0.5 bg-bg-elevated/60 dark:bg-black/20 border border-bg-border rounded-lg p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
            value === o.value
              ? 'bg-bg-surface dark:bg-bg-elevated text-gray-900 dark:text-white shadow-sm border border-bg-border'
              : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          {o.label}
        </button>
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

  const [filterStatus, setFilterStatus] = useState<'all' | FeatureStatus>('all')
  const [filterMember, setFilterMember] = useState<'all' | number>('all')
  const [filterType, setFilterType] = useState<'all' | 'baseline' | 'cr'>('all')
  const [zoom, setZoom] = useState<'month' | 'week'>('month')
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchProject(id), fetchBaseline(id), fetchCRs(id)])
      .finally(() => setLoading(false))
  }, [id])

  const onBodyScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current)
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft
  }

  const DAY_W = zoom === 'week' ? 48 : 22

  const { items, milestones, viewStart, viewEnd, totalDays } = useMemo(() => {
    if (!baseline) return { items: [], milestones: [], viewStart: new Date(), viewEnd: new Date(), totalDays: 60 }
    const projectStart = baseline.locked_at ? new Date(baseline.locked_at) : new Date(baseline.created_at)
    const approvedCRs = crs.filter(cr => cr.status === 'approved')
    const members = currentProject?.members ?? []
    const rawItems = buildRoadmapItems(baseline.features, approvedCRs, members, projectStart)
    const allDates = rawItems.flatMap(i => [i.startDate, i.endDate])
    const milestonesDates = baseline.milestones.map(m => new Date(m.due_date))
    const allPoints = [...allDates, ...milestonesDates, new Date()]
    const earliest = new Date(Math.min(...allPoints.map(d => d.getTime())))
    const latest   = new Date(Math.max(...allPoints.map(d => d.getTime())))
    const viewStart = addDays(earliest, -14)
    const viewEnd   = addDays(latest, 21)
    const totalDays = daysBetween(viewStart, viewEnd)
    const milestones: MilestoneMarker[] = baseline.milestones.map(m => ({
      id: m.id, name: m.name, date: new Date(m.due_date), is_completed: m.is_completed,
    }))
    return { items: rawItems, milestones, viewStart, viewEnd, totalDays }
  }, [baseline, crs, currentProject])

  const filteredItems = useMemo(() => items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (filterType === 'baseline' && item.isFromCR) return false
    if (filterType === 'cr' && !item.isFromCR) return false
    if (filterMember !== 'all' && !item.assignedMembers.some(m => m.user_id === filterMember)) return false
    return true
  }), [items, filterStatus, filterMember, filterType])

  const columnHeaders = useMemo(() => {
    const headers: { label: string; startDay: number; width: number; isMonth: boolean }[] = []
    if (zoom === 'month') {
      let cur = new Date(viewStart); cur.setDate(1)
      while (cur <= viewEnd) {
        const monthStart = new Date(cur)
        const nextMonth  = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
        const clampedStart = monthStart < viewStart ? viewStart : monthStart
        const clampedEnd   = nextMonth > viewEnd ? viewEnd : nextMonth
        const startDay = daysBetween(viewStart, clampedStart)
        const days = daysBetween(clampedStart, clampedEnd)
        headers.push({ label: formatMonth(monthStart), startDay, width: days * DAY_W, isMonth: true })
        cur = nextMonth
      }
    } else {
      for (let d = 0; d < totalDays; d += 7) {
        const weekStart = addDays(viewStart, d)
        const days = Math.min(7, totalDays - d)
        headers.push({ label: formatDay(weekStart), startDay: d, width: days * DAY_W, isMonth: false })
      }
    }
    return headers
  }, [viewStart, viewEnd, zoom, totalDays, DAY_W])

  const todayOffset = daysBetween(viewStart, new Date()) * DAY_W

  const getBarStyle = (item: RoadmapItem) => ({
    left: daysBetween(viewStart, item.startDate) * DAY_W,
    width: Math.max(item.effort_days * DAY_W, 36),
  })

  const getMilestoneOffset = (m: MilestoneMarker) => daysBetween(viewStart, m.date) * DAY_W

  if (loading) return <AppLayout title="Roadmap"><PageSpinner /></AppLayout>
  if (!baseline) return (
    <AppLayout title="Roadmap">
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-bg-elevated flex items-center justify-center text-2xl">🗺</div>
        <p className="text-gray-500 text-sm">No baseline found. Set up the baseline first.</p>
      </div>
    </AppLayout>
  )

  const members = currentProject?.members ?? []
  const ROW_H = 48
  const MILE_H = 44
  const HEADER_H = 38

  return (
    <AppLayout title={currentProject?.name ?? 'Roadmap'} subtitle="Project Roadmap">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <PillGroup
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Completed', value: 'completed' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Planned', value: 'planned' },
          ]}
        />
        <PillGroup
          value={filterType}
          onChange={setFilterType}
          options={[
            { label: 'All Types', value: 'all' },
            { label: 'Baseline', value: 'baseline' },
            { label: 'CR Added', value: 'cr' },
          ]}
        />

        {/* Member filter */}
        <div className="flex items-center gap-1.5 bg-bg-elevated/60 dark:bg-black/20 border border-bg-border rounded-lg px-3 py-1">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <select
            value={filterMember}
            onChange={e => setFilterMember(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
          >
            <option value="all">All members</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.user.name}</option>
            ))}
          </select>
        </div>

        {/* Zoom */}
        <div className="ml-auto">
          <PillGroup
            value={zoom}
            onChange={setZoom}
            options={[
              { label: 'Month', value: 'month' },
              { label: 'Week', value: 'week' },
            ]}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-emerald-500/70 inline-block" />
            Baseline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-amber-400/25 border border-dashed border-amber-400/50 inline-block" />
            CR Added
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-0.5 h-3.5 bg-indigo-400/80 rounded-full inline-block" />
            Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-amber-400 text-[11px]">◆</span>
            Milestone
          </span>
        </div>
      </div>

      {/* ── Team row ─────────────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[11px] text-gray-400 font-medium tracking-wider uppercase shrink-0">Team</span>
          {members.map(m => (
            <button
              key={m.user_id}
              onClick={() => setFilterMember(filterMember === m.user_id ? 'all' : m.user_id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all border ${
                filterMember === m.user_id
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-bg-border text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <Avatar member={m} size={4} />
              <span className="font-medium">{m.user.name}</span>
              <span className={`text-[9px] px-1.5 py-px rounded-full font-medium ${
                m.role === 'manager'     ? 'bg-emerald-500/15 text-emerald-500' :
                m.role === 'stakeholder' ? 'bg-gray-500/15 text-gray-400' :
                                          'bg-blue-500/15 text-blue-400'
              }`}>
                {m.role}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Gantt ────────────────────────────────────────────────────────────── */}
      <div className="bg-bg-surface dark:bg-bg-card border border-bg-border rounded-2xl overflow-hidden shadow-sm">

        {/* Column headers */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="shrink-0 flex items-center px-4 bg-bg-elevated/50"
            style={{ width: LEFT_PANEL_W, height: HEADER_H, borderRight: '1px solid var(--border)' }}
          >
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Feature</span>
          </div>
          <div ref={headerScrollRef} className="flex-1 overflow-hidden">
            <div className="relative" style={{ width: totalDays * DAY_W, height: HEADER_H }}>
              {columnHeaders.map((col, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center px-3"
                  style={{ left: col.startDay * DAY_W, width: col.width }}
                >
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">{col.label}</span>
                  {/* Month separator */}
                  {i > 0 && (
                    <div className="absolute left-0 top-2 bottom-2 w-px bg-bg-border" />
                  )}
                </div>
              ))}
              {/* Today dot in header */}
              {todayOffset >= 0 && todayOffset <= totalDays * DAY_W && (
                <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: todayOffset }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 -translate-x-px" />
                  <div className="w-px flex-1 bg-indigo-400/50" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          ref={bodyScrollRef}
          className="flex overflow-x-auto"
          onScroll={onBodyScroll}
          style={{ maxHeight: '60vh' }}
        >
          {/* Left panel */}
          <div
            className="shrink-0 bg-bg-surface dark:bg-bg-card"
            style={{ width: LEFT_PANEL_W, position: 'sticky', left: 0, zIndex: 10, boxShadow: '2px 0 8px rgba(0,0,0,0.06)' }}
          >
            {filteredItems.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 px-4 transition-colors ${
                  hoveredId === item.id
                    ? 'bg-bg-elevated/70'
                    : idx % 2 === 0 ? 'bg-transparent' : 'bg-bg-elevated/25 dark:bg-black/10'
                }`}
                style={{ height: ROW_H, borderBottom: '1px solid var(--border)', }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <StatusDot status={item.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate leading-tight">
                      {item.name}
                    </span>
                    {item.isFromCR && (
                      <span className="shrink-0 text-[9px] bg-amber-400/15 text-amber-500 dark:text-amber-400 border border-amber-400/30 px-1.5 rounded-full font-medium">
                        CR
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                    {item.effort_days}d &middot; {formatDay(item.startDate)}
                  </div>
                </div>
                <AvatarStack members={item.assignedMembers} />
              </div>
            ))}

            {/* Milestones section */}
            {milestones.length > 0 && (
              <>
                <div
                  className="flex items-center px-4 bg-bg-elevated/40"
                  style={{ height: 28, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
                >
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Milestones</span>
                </div>
                {milestones.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 px-4"
                    style={{ height: MILE_H, borderBottom: '1px solid var(--border)' }}
                  >
                    <span className={`text-xs ${m.is_completed ? 'text-emerald-400' : 'text-amber-400'}`}>◆</span>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-medium truncate ${m.is_completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}
                        style={{ maxWidth: 168 }}
                      >
                        {m.name}
                      </div>
                      <div className="text-[10px] text-gray-400 tabular-nums">{formatDay(m.date)}</div>
                    </div>
                    {m.is_completed && (
                      <span className="ml-auto text-[9px] bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25 px-1.5 py-px rounded-full font-medium">
                        Done
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}

            {filteredItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                No features match filters
              </div>
            )}
          </div>

          {/* Gantt bars area */}
          <div className="flex-1 relative" style={{ minWidth: totalDays * DAY_W }}>

            {/* Vertical grid */}
            <div className="absolute inset-0 pointer-events-none">
              {columnHeaders.map((col, i) => (
                i > 0 && (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: col.startDay * DAY_W,
                      width: 1,
                      background: 'var(--border)',
                      opacity: 0.4,
                    }}
                  />
                )
              ))}

              {/* Today line — clean indigo glow */}
              {todayOffset >= 0 && todayOffset <= totalDays * DAY_W && (
                <div
                  className="absolute top-0 bottom-0 z-10"
                  style={{
                    left: todayOffset,
                    width: 2,
                    background: 'linear-gradient(to bottom, rgba(99,102,241,0.9), rgba(99,102,241,0.2))',
                    boxShadow: '0 0 8px rgba(99,102,241,0.4)',
                  }}
                />
              )}
            </div>

            {/* Feature rows */}
            {filteredItems.map((item, idx) => {
              const { left, width } = getBarStyle(item)
              const isHovered = hoveredId === item.id
              const cfg = barConfig(item)
              return (
                <div
                  key={item.id}
                  className={`relative flex items-center transition-colors ${
                    isHovered ? 'bg-bg-elevated/30 dark:bg-white/[0.03]' : idx % 2 !== 0 ? 'bg-bg-elevated/15 dark:bg-black/[0.08]' : ''
                  }`}
                  style={{ height: ROW_H, borderBottom: '1px solid var(--border)', }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Bar */}
                  <div
                    className={`absolute flex items-center px-2.5 gap-1.5 cursor-default select-none transition-all duration-150 rounded-full ${cfg.bg}`}
                    style={{
                      left,
                      width,
                      height: 28,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      boxShadow: isHovered ? cfg.glow : 'none',
                      filter: isHovered ? 'brightness(1.1)' : 'none',
                    }}
                  >
                    {/* In-progress shimmer */}
                    {item.status === 'in_progress' && (
                      <div
                        className="absolute inset-0 rounded-full overflow-hidden"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)' }}
                      />
                    )}
                    <span className={`relative text-[10px] font-semibold truncate flex-1 ${cfg.text}`}>
                      {item.name}
                    </span>
                    {item.assignedMembers.length > 0 && (
                      <div className="relative flex -space-x-1 shrink-0">
                        {item.assignedMembers.slice(0, 2).map(m => (
                          <div
                            key={m.user_id}
                            title={m.user.name}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white/20"
                            style={{ backgroundColor: memberColorHex(m.user_id) }}
                          >
                            {initials(m.user.name)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div
                      className="absolute z-50 pointer-events-none"
                      style={{ top: '110%', left: Math.max(left, 0), minWidth: 220, maxWidth: 280 }}
                    >
                      <div className="bg-bg-surface dark:bg-bg-elevated border border-bg-border rounded-xl p-3 shadow-xl">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{item.name}</span>
                          {item.isFromCR && (
                            <Link
                              to={`/projects/${id}/change-requests/${Math.abs(item.crId ?? 0)}`}
                              className="text-[10px] shrink-0 bg-amber-400/15 text-amber-500 dark:text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-medium hover:bg-amber-400/25 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              View CR →
                            </Link>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 leading-relaxed line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span>{item.effort_days}d effort</span>
                          <span>{formatDay(item.startDate)} → {formatDay(item.endDate)}</span>
                        </div>
                        {item.assignedMembers.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-bg-border flex items-center gap-1.5">
                            <AvatarStack members={item.assignedMembers} />
                            <span className="text-[10px] text-gray-500">
                              {item.assignedMembers.map(m => m.user.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Milestone section */}
            {milestones.length > 0 && (
              <>
                <div style={{ height: 28, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
                  className="bg-bg-elevated/20"
                />
                {milestones.map(m => {
                  const offset = getMilestoneOffset(m)
                  return (
                    <div key={m.id} className="relative" style={{ height: MILE_H, borderBottom: '1px solid var(--border)' }}>
                      {/* Vertical stem */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: offset,
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: m.is_completed
                            ? 'linear-gradient(to bottom, rgba(16,185,129,0.4), transparent)'
                            : 'linear-gradient(to bottom, rgba(245,158,11,0.4), transparent)',
                        }}
                      />
                      {/* Diamond */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center"
                        style={{ left: offset }}
                      >
                        <div
                          className="w-3 h-3 rotate-45 rounded-sm"
                          style={{
                            backgroundColor: m.is_completed ? '#10b981' : '#f59e0b',
                            boxShadow: m.is_completed
                              ? '0 0 6px rgba(16,185,129,0.5)'
                              : '0 0 6px rgba(245,158,11,0.5)',
                          }}
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

      {/* ── Summary ──────────────────────────────────────────────────────────── */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Total Features', value: filteredItems.filter(i => !i.isFromCR).length, accent: 'text-gray-700 dark:text-gray-200' },
          { label: 'CR Added',       value: filteredItems.filter(i =>  i.isFromCR).length, accent: 'text-amber-500 dark:text-amber-400' },
          { label: 'Completed',      value: filteredItems.filter(i => i.status === 'completed').length, accent: 'text-emerald-500 dark:text-emerald-400' },
          { label: 'In Progress',    value: filteredItems.filter(i => i.status === 'in_progress').length, accent: 'text-blue-500 dark:text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-bg-surface dark:bg-bg-card border border-bg-border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
            <span className="text-xs text-gray-400 font-medium">{s.label}</span>
            <span className={`text-xl font-bold tabular-nums ${s.accent}`}>{s.value}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
