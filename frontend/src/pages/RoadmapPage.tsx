import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProjectStore, useBaselineStore, useCRStore } from '../store'
import { baselineApi, crApi } from '../api'
import { AppLayout } from '../components/layout/AppLayout'
import { PageSpinner } from '../components/ui/Spinner'
import type { Feature, FeatureStatus, ChangeRequest, ProjectMember, CRStatus } from '../types'

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

const MEMBER_COLORS_HEX = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4',
]
function memberColorHex(userId: number) { return MEMBER_COLORS_HEX[userId % MEMBER_COLORS_HEX.length] }

function crStatusToFeatureStatus(s: string): FeatureStatus {
  if (s === 'done') return 'completed'
  if (s === 'in_progress') return 'in_progress'
  return 'planned'
}

function buildRoadmapItems(
  features: Feature[],
  allCRs: ChangeRequest[],
  members: ProjectMember[],
  projectStart: Date,
): RoadmapItem[] {
  const statusOrder: Record<FeatureStatus, number> = {
    completed: 0, in_progress: 1, planned: 2, removed: 3,
  }
  const sorted = [...features].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  const laneEnd = [new Date(projectStart), new Date(projectStart)]
  const today = new Date()
  const items: RoadmapItem[] = []

  sorted.forEach((f, i) => {
    const lane = i % 2
    let start: Date

    if (f.start_date) {
      start = new Date(f.start_date)
    } else {
      const otherLane = 1 - lane
      start = new Date(Math.min(laneEnd[lane].getTime(), laneEnd[otherLane].getTime() + DAY_MS * 3))
      if (start < projectStart) start = new Date(projectStart)
      if (f.status === 'in_progress' && start > today)
        start = addDays(today, -Math.floor(f.effort_days * 0.4))
    }

    let end = addDays(start, Math.max(f.effort_days, 1))

    // Completed = bar ends today (actual finish date), never a future estimate
    if (f.status === 'completed') {
      end = new Date(today)
      if (end <= start) end = addDays(start, 1) // guard: start can't be after end
    }

    laneEnd[lane] = addDays(end, 2)

    const assignedIds = f.assignee_ids ?? []
    const assigned: ProjectMember[] = assignedIds.length > 0
      ? members.filter(m => assignedIds.includes(m.user_id))
      : members.length > 0
        ? [
            members[i % members.length],
            ...(members.length > 1 && f.effort_days > 10 ? [members[(i + 1) % members.length]] : []),
          ]
        : []

    items.push({
      id: f.id, name: f.name, description: f.description, effort_days: f.effort_days,
      status: f.status, startDate: start, endDate: end, isFromCR: false, assignedMembers: assigned, lane,
    })
  })

  // CR feature_add bars — include approved, in_progress, done
  const crItems = allCRs.filter(cr =>
    cr.cr_type === 'feature_add' && ['approved', 'in_progress', 'done'].includes(cr.status)
  )
  crItems.forEach((cr, i) => {
    const refDate = cr.decided_at ? new Date(cr.decided_at) : new Date()
    const start = addDays(refDate, 5)
    const effort = cr.ai_analysis ? 10 : 8
    let end = addDays(start, effort)
    const featureStatus = crStatusToFeatureStatus(cr.status)
    if (featureStatus === 'completed') {
      end = new Date(today)
      if (end <= start) end = addDays(start, 1)
    }
    const assigned: ProjectMember[] = members.length > 0 ? [members[i % members.length]] : []
    items.push({
      id: -(cr.id), name: cr.title, description: cr.description, effort_days: effort,
      status: featureStatus, startDate: start, endDate: end, isFromCR: true, crId: cr.id,
      assignedMembers: assigned, lane: i % 2,
    })
  })

  return items
}

// ─── Bar color config ─────────────────────────────────────────────────────────

function barConfig(item: RoadmapItem): { bg: string; glow: string; text: string } {
  if (item.isFromCR) {
    const map: Record<FeatureStatus, { bg: string; glow: string; text: string }> = {
      completed:   { bg: 'bg-amber-500/70',                                              glow: '0 0 12px rgba(245,158,11,0.35)', text: 'text-white' },
      in_progress: { bg: 'bg-amber-400/40 border border-amber-400/60',                  glow: '0 0 14px rgba(245,158,11,0.4)',  text: 'text-amber-200' },
      planned:     { bg: 'bg-amber-400/20 border border-dashed border-amber-400/50',    glow: 'none',                           text: 'text-amber-300' },
      removed:     { bg: 'bg-red-900/30',                                                glow: 'none',                           text: 'text-red-400/70' },
    }
    return map[item.status]
  }
  const map: Record<FeatureStatus, { bg: string; glow: string; text: string }> = {
    completed:   { bg: 'bg-emerald-500/75',  glow: '0 0 12px rgba(16,185,129,0.3)',  text: 'text-white' },
    in_progress: { bg: 'bg-blue-500/60',     glow: '0 0 14px rgba(59,130,246,0.35)', text: 'text-white' },
    planned:     { bg: 'bg-slate-500/40',    glow: 'none',                            text: 'text-slate-300' },
    removed:     { bg: 'bg-red-900/30',      glow: 'none',                            text: 'text-red-400/70' },
  }
  return map[item.status]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: FeatureStatus }) {
  const map: Record<FeatureStatus, string> = {
    completed:   'bg-emerald-400',
    in_progress: 'bg-blue-400 animate-pulse',
    planned:     'bg-slate-400',
    removed:     'bg-red-500',
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

// ─── Side Panel ───────────────────────────────────────────────────────────────

function SidePanel({
  item, projectId, members, latestFeature, latestCR, onClose, onRefreshFeatures, onRefreshCRs,
}: {
  item: RoadmapItem
  projectId: number
  members: ProjectMember[]
  latestFeature: Feature | null
  latestCR: ChangeRequest | null
  onClose: () => void
  onRefreshFeatures: () => void
  onRefreshCRs: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [showAssignees, setShowAssignees] = useState(false)
  const assigneesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showAssignees) return
    const h = (e: MouseEvent) => {
      if (assigneesRef.current && !assigneesRef.current.contains(e.target as Node))
        setShowAssignees(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showAssignees])

  const patchFeature = async (data: Partial<{ status: FeatureStatus; start_date: string | null; assignee_ids: number[] }>) => {
    setSaving(true)
    try {
      await baselineApi.updateFeature(projectId, item.id, data)
      onRefreshFeatures()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update.')
    } finally {
      setSaving(false)
    }
  }

  const patchCR = async (status: CRStatus) => {
    if (!latestCR) return
    setSaving(true)
    try {
      await crApi.updateStatus(projectId, latestCR.id, status)
      onRefreshCRs()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update.')
    } finally {
      setSaving(false)
    }
  }

  const feature = latestFeature
  const cr = latestCR
  const assignedIds = feature?.assignee_ids ?? []
  const assignedMembers = members.filter(m => assignedIds.includes(m.user_id))
  const unassignedMembers = members.filter(m => !assignedIds.includes(m.user_id))

  const STATUS_OPTIONS: { value: FeatureStatus; label: string; dot: string; active: string }[] = [
    { value: 'planned',     label: 'Planned',     dot: '○', active: 'border-gray-500 bg-gray-700/50 text-gray-200' },
    { value: 'in_progress', label: 'In Progress', dot: '◑', active: 'border-blue-500/60 bg-blue-900/30 text-blue-300' },
    { value: 'completed',   label: 'Completed',   dot: '●', active: 'border-emerald-500/60 bg-emerald-900/30 text-emerald-300' },
    { value: 'removed',     label: 'Removed',     dot: '✕', active: 'border-red-700/50 bg-red-900/20 text-red-400' },
  ]

  const crStatusLabel: Record<string, string> = {
    approved:    'Approved',
    in_progress: 'In Progress',
    done:        'Done',
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`relative w-full max-w-sm bg-bg-card border-l border-bg-border shadow-2xl overflow-y-auto animate-slide-in-right ${saving ? 'opacity-70 pointer-events-none' : ''}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-card flex items-start justify-between p-5 border-b border-bg-border">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              {item.isFromCR ? (
                <span className="text-[10px] bg-amber-400/15 text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-medium">
                  CR Feature
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Baseline Feature</span>
              )}
            </div>
            <h2 className="text-base font-bold text-gray-100 leading-snug">{item.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-bg-border transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
          )}

          {/* Status */}
          <div>
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2.5">Status</p>
            {!item.isFromCR ? (
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => feature?.status !== opt.value && patchFeature({ status: opt.value })}
                    disabled={feature?.status === opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      feature?.status === opt.value
                        ? opt.active
                        : 'border-bg-border text-gray-500 hover:border-gray-500 hover:text-gray-300 cursor-pointer'
                    }`}
                  >
                    <span className="text-base leading-none">{opt.dot}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              /* CR status controls */
              <div className="flex flex-col gap-2">
                <div className={`px-3 py-2.5 rounded-lg border text-sm font-medium ${
                  cr?.status === 'done'
                    ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                    : cr?.status === 'in_progress'
                      ? 'bg-blue-900/30 border-blue-500/50 text-blue-300'
                      : 'bg-amber-900/20 border-amber-500/40 text-amber-300'
                }`}>
                  Current: {crStatusLabel[cr?.status ?? 'approved'] ?? 'Approved'}
                </div>
                <div className="flex gap-2">
                  {cr?.status !== 'in_progress' && cr?.status !== 'done' && (
                    <button
                      onClick={() => patchCR('in_progress')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-500/40 bg-blue-900/20 text-blue-300 text-xs font-medium hover:bg-blue-900/40 transition-colors"
                    >
                      <span className="text-base leading-none">◑</span>
                      Start Work
                    </button>
                  )}
                  {cr?.status !== 'done' && (
                    <button
                      onClick={() => patchCR('done')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-900/20 text-emerald-300 text-xs font-medium hover:bg-emerald-900/40 transition-colors"
                    >
                      <span className="text-base leading-none">●</span>
                      Mark Done
                    </button>
                  )}
                  {cr?.status === 'done' && (
                    <div className="flex-1 text-center text-xs text-emerald-400 py-2">
                      ✓ Completed
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2.5">Timeline</p>
            <div className="bg-bg-elevated rounded-xl border border-bg-border divide-y divide-bg-border">
              {!item.isFromCR && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 mb-0.5">Start Date</p>
                    <input
                      type="date"
                      value={feature?.start_date ?? ''}
                      onChange={e => patchFeature({ start_date: e.target.value || null })}
                      className="bg-transparent text-sm text-gray-200 outline-none cursor-pointer hover:text-white transition-colors w-full"
                      placeholder="Not set"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3">
                <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">
                    {(feature?.status === 'completed' || cr?.status === 'done') ? 'Completed' : 'Expected End'}
                  </p>
                  <p className="text-sm text-gray-200">{formatDay(item.endDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">Effort Estimate</p>
                  <p className="text-sm text-gray-200">{item.effort_days} days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignees — features only */}
          {!item.isFromCR && (
            <div>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2.5">Team</p>
              <div className="flex flex-wrap gap-2">
                {assignedMembers.map(m => (
                  <div key={m.user_id} className="flex items-center gap-1.5 bg-bg-elevated rounded-xl px-3 py-1.5 border border-bg-border">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ backgroundColor: memberColorHex(m.user_id) }}
                    >
                      {initials(m.user.name)}
                    </div>
                    <span className="text-xs text-gray-300 font-medium">{m.user.name}</span>
                    <button
                      onClick={() => patchFeature({ assignee_ids: assignedIds.filter(id => id !== m.user_id) })}
                      className="text-gray-600 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add member */}
                {unassignedMembers.length > 0 && (
                  <div className="relative" ref={assigneesRef}>
                    <button
                      onClick={() => setShowAssignees(v => !v)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 bg-bg-elevated border border-dashed border-bg-border rounded-xl px-3 py-1.5 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Assign
                    </button>
                    {showAssignees && (
                      <div className="absolute z-10 top-full left-0 mt-1.5 bg-bg-card border border-bg-border rounded-xl shadow-xl p-1.5 min-w-[200px]">
                        {unassignedMembers.map(m => (
                          <button
                            key={m.user_id}
                            onClick={() => {
                              patchFeature({ assignee_ids: [...assignedIds, m.user_id] })
                              setShowAssignees(false)
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-elevated text-xs text-gray-300 transition-colors"
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                              style={{ backgroundColor: memberColorHex(m.user_id) }}
                            >
                              {initials(m.user.name)}
                            </div>
                            <span className="flex-1 text-left">{m.user.name}</span>
                            <span className={`text-[9px] px-1.5 py-px rounded-full ${
                              m.role === 'manager' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>{m.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {members.length === 0 && (
                  <p className="text-xs text-gray-600">No project members yet.</p>
                )}
              </div>
            </div>
          )}

          {/* CR link */}
          {item.isFromCR && item.crId && (
            <div className="border-t border-bg-border pt-1">
              <Link
                to={`/projects/${projectId}/change-requests/${item.crId}`}
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 bg-amber-400/10 border border-amber-400/25 rounded-xl text-amber-300 hover:bg-amber-400/20 transition-colors group"
              >
                <span className="text-sm font-medium">View Change Request</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              {cr?.ai_analysis && (
                <div className="mt-3 flex items-center gap-2 px-1 text-xs text-gray-500">
                  <span>AI Risk:</span>
                  <span className={`font-semibold ${
                    cr.ai_analysis.risk_level === 'High'   ? 'text-red-400' :
                    cr.ai_analysis.risk_level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{cr.ai_analysis.risk_level}</span>
                  <span className="text-gray-600">({(cr.ai_analysis.risk_score * 100).toFixed(0)}%)</span>
                  <span className="ml-auto text-gray-500">{cr.ai_analysis.timeline_impact}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const hoverTimer = useRef<ReturnType<typeof setTimeout>>()
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchProject(id), fetchBaseline(id), fetchCRs(id)])
      .finally(() => setLoading(false))
  }, [id])

  const enterItem = (itemId: number) => {
    clearTimeout(hoverTimer.current)
    setHoveredId(itemId)
  }
  const leaveItem = () => {
    hoverTimer.current = setTimeout(() => setHoveredId(null), 120)
  }

  const onBodyScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current)
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft
  }

  const DAY_W = zoom === 'week' ? 48 : 22

  const { items, milestones, viewStart, viewEnd, totalDays } = useMemo(() => {
    if (!baseline) return { items: [], milestones: [], viewStart: new Date(), viewEnd: new Date(), totalDays: 60 }
    const projectStart = baseline.locked_at ? new Date(baseline.locked_at) : new Date(baseline.created_at)
    const members = currentProject?.members ?? []
    const rawItems = buildRoadmapItems(baseline.features, crs, members, projectStart)
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

  const selectedItem = useMemo(() => items.find(i => i.id === selectedId) ?? null, [items, selectedId])

  const columnHeaders = useMemo(() => {
    const headers: { label: string; startDay: number; width: number }[] = []
    if (zoom === 'month') {
      let cur = new Date(viewStart); cur.setDate(1)
      while (cur <= viewEnd) {
        const monthStart = new Date(cur)
        const nextMonth  = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
        const clampedStart = monthStart < viewStart ? viewStart : monthStart
        const clampedEnd   = nextMonth > viewEnd ? viewEnd : nextMonth
        const startDay = daysBetween(viewStart, clampedStart)
        const days = daysBetween(clampedStart, clampedEnd)
        headers.push({ label: formatMonth(monthStart), startDay, width: days * DAY_W })
        cur = nextMonth
      }
    } else {
      for (let d = 0; d < totalDays; d += 7) {
        const weekStart = addDays(viewStart, d)
        const days = Math.min(7, totalDays - d)
        headers.push({ label: formatDay(weekStart), startDay: d, width: days * DAY_W })
      }
    }
    return headers
  }, [viewStart, viewEnd, zoom, totalDays, DAY_W])

  const todayOffset = daysBetween(viewStart, new Date()) * DAY_W
  const getBarStyle = (item: RoadmapItem) => ({
    left: daysBetween(viewStart, item.startDate) * DAY_W,
    width: Math.max(daysBetween(item.startDate, item.endDate) * DAY_W, 36),
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

      {/* Click hint */}
      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
        </svg>
        Click any feature or CR bar to manage status, dates, and assignees
      </p>

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
                  {i > 0 && <div className="absolute left-0 top-2 bottom-2 w-px bg-bg-border" />}
                </div>
              ))}
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
                className={`flex items-center gap-2.5 px-4 transition-colors cursor-pointer ${
                  selectedId === item.id
                    ? 'bg-indigo-500/10 border-r-2 border-r-indigo-400'
                    : hoveredId === item.id
                      ? 'bg-bg-elevated/70'
                      : idx % 2 === 0 ? 'bg-transparent' : 'bg-bg-elevated/25 dark:bg-black/10'
                }`}
                style={{ height: ROW_H, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={() => enterItem(item.id)}
                onMouseLeave={leaveItem}
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
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
                    {item.effort_days}d · {formatDay(item.startDate)}
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
                    style={{ left: col.startDay * DAY_W, width: 1, background: 'var(--border)', opacity: 0.4 }}
                  />
                )
              ))}
              {todayOffset >= 0 && todayOffset <= totalDays * DAY_W && (
                <div
                  className="absolute top-0 bottom-0 z-10"
                  style={{
                    left: todayOffset, width: 2,
                    background: 'linear-gradient(to bottom, rgba(99,102,241,0.9), rgba(99,102,241,0.2))',
                    boxShadow: '0 0 8px rgba(99,102,241,0.4)',
                  }}
                />
              )}
            </div>

            {/* Feature rows */}
            {filteredItems.map((item, idx) => {
              const { left, width } = getBarStyle(item)
              const isHovered  = hoveredId  === item.id
              const isSelected = selectedId === item.id
              const cfg = barConfig(item)
              return (
                <div
                  key={item.id}
                  className={`relative flex items-center transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-500/[0.06]' :
                    isHovered  ? 'bg-bg-elevated/30 dark:bg-white/[0.03]' :
                    idx % 2 !== 0 ? 'bg-bg-elevated/15 dark:bg-black/[0.08]' : ''
                  }`}
                  style={{ height: ROW_H, borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={() => enterItem(item.id)}
                  onMouseLeave={leaveItem}
                  onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                >
                  {/* Bar */}
                  <div
                    className={`absolute flex items-center px-2.5 gap-1.5 select-none transition-all duration-150 rounded-full ${cfg.bg}`}
                    style={{
                      left, width, height: 28,
                      top: '50%', transform: 'translateY(-50%)',
                      boxShadow: (isHovered || isSelected) ? cfg.glow : 'none',
                      filter: (isHovered || isSelected) ? 'brightness(1.15)' : 'none',
                      outline: isSelected ? '2px solid rgba(99,102,241,0.5)' : 'none',
                      outlineOffset: 2,
                    }}
                  >
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

                  {/* Hover tooltip — no action links, just info preview */}
                  {isHovered && !isSelected && (
                    <div
                      className="absolute z-50 pointer-events-auto"
                      style={{ top: 'calc(50% + 16px)', left: Math.max(left, 0), minWidth: 200, maxWidth: 260 }}
                      onMouseEnter={() => enterItem(item.id)}
                      onMouseLeave={leaveItem}
                    >
                      <div className="bg-bg-surface dark:bg-bg-elevated border border-bg-border rounded-xl p-3 shadow-xl">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-tight">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="capitalize">{item.status.replace('_', ' ')}</span>
                          <span>·</span>
                          <span>{item.effort_days}d</span>
                          <span>·</span>
                          <span>{formatDay(item.startDate)} → {formatDay(item.endDate)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5">Click to open editor →</p>
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
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: offset, top: 0, bottom: 0, width: 1,
                          background: m.is_completed
                            ? 'linear-gradient(to bottom, rgba(16,185,129,0.4), transparent)'
                            : 'linear-gradient(to bottom, rgba(245,158,11,0.4), transparent)',
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center"
                        style={{ left: offset }}
                      >
                        <div
                          className="w-3 h-3 rotate-45 rounded-sm"
                          style={{
                            backgroundColor: m.is_completed ? '#10b981' : '#f59e0b',
                            boxShadow: m.is_completed ? '0 0 6px rgba(16,185,129,0.5)' : '0 0 6px rgba(245,158,11,0.5)',
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

      {/* ── Side Panel ───────────────────────────────────────────────────────── */}
      {selectedItem && (
        <SidePanel
          item={selectedItem}
          projectId={id}
          members={members}
          latestFeature={
            selectedItem.isFromCR ? null
              : (baseline.features.find(f => f.id === selectedItem.id) ?? null)
          }
          latestCR={
            selectedItem.isFromCR && selectedItem.crId != null
              ? (crs.find(c => c.id === selectedItem.crId) ?? null)
              : null
          }
          onClose={() => setSelectedId(null)}
          onRefreshFeatures={() => fetchBaseline(id)}
          onRefreshCRs={() => fetchCRs(id)}
        />
      )}
    </AppLayout>
  )
}
