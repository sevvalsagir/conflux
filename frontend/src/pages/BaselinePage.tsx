import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBaselineStore, useProjectStore } from '../store'
import { baselineApi } from '../api'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import type { Feature, FeatureStatus, Milestone, ProjectMember } from '../types'
import { format, parseISO } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEMBER_COLORS_HEX = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4',
]
function memberColor(userId: number) { return MEMBER_COLORS_HEX[userId % MEMBER_COLORS_HEX.length] }
function initials(name: string) { return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() }

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BaselinePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const { baseline, fetchBaseline } = useBaselineStore()
  const { currentProject, fetchProject } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [locking, setLocking] = useState(false)

  // Feature modal
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [featureName, setFeatureName] = useState('')
  const [featureDesc, setFeatureDesc] = useState('')
  const [featureEffort, setFeatureEffort] = useState('')
  const [savingFeature, setSavingFeature] = useState(false)

  // Milestone modal
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [milestoneName, setMilestoneName] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')
  const [savingMilestone, setSavingMilestone] = useState(false)

  useEffect(() => {
    Promise.all([fetchBaseline(id), fetchProject(id)]).finally(() => setLoading(false))
  }, [id])

  const handleLock = async () => {
    if (!confirm('Lock the baseline? After locking, all changes must go through a Change Request.')) return
    setLocking(true)
    try {
      await baselineApi.lock(id)
      await fetchBaseline(id)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to lock baseline.')
    } finally {
      setLocking(false)
    }
  }

  const handleAddFeature = async () => {
    if (!featureName.trim()) return
    setSavingFeature(true)
    try {
      await baselineApi.addFeature(id, featureName.trim(), featureDesc.trim(), Number(featureEffort) || 0)
      await fetchBaseline(id)
      setShowFeatureModal(false)
      setFeatureName(''); setFeatureDesc(''); setFeatureEffort('')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add feature.')
    } finally {
      setSavingFeature(false)
    }
  }

  const handleDeleteFeature = async (featureId: number) => {
    if (!confirm('Delete this feature?')) return
    try {
      await baselineApi.deleteFeature(id, featureId)
      await fetchBaseline(id)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cannot delete.')
    }
  }

  const handleAddMilestone = async () => {
    if (!milestoneName.trim() || !milestoneDate) return
    setSavingMilestone(true)
    try {
      await baselineApi.addMilestone(id, milestoneName.trim(), milestoneDate)
      await fetchBaseline(id)
      setShowMilestoneModal(false)
      setMilestoneName(''); setMilestoneDate('')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add milestone.')
    } finally {
      setSavingMilestone(false)
    }
  }

  const handleToggleMilestone = async (m: Milestone) => {
    try {
      await baselineApi.updateMilestone(id, m.id, { is_completed: !m.is_completed })
      await fetchBaseline(id)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update milestone.')
    }
  }

  const handleDeleteMilestone = async (milestoneId: number) => {
    if (!confirm('Delete this milestone?')) return
    try {
      await baselineApi.deleteMilestone(id, milestoneId)
      await fetchBaseline(id)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cannot delete.')
    }
  }

  const totalEffort = baseline?.features.reduce((sum, f) => sum + f.effort_days, 0) ?? 0
  const members = currentProject?.members ?? []

  if (loading) return <AppLayout title="Baseline"><PageSpinner /></AppLayout>

  return (
    <AppLayout title="Baseline" subtitle="Define and lock your project scope">
      {/* Locked Banner */}
      {baseline?.is_locked && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-green/10 border border-accent-green/30 mb-6">
          <svg className="w-5 h-5 text-accent-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-accent-green">Baseline is locked</p>
            <p className="text-xs text-accent-green/70">
              Locked on {baseline.locked_at ? format(parseISO(baseline.locked_at), 'MMM d, yyyy') : '—'}.
              Scope fields are frozen — use a Change Request to modify name, description, or effort.
              Status, start date, and assignees can still be updated inline.
            </p>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Features</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {baseline?.features.length ?? 0} features · {totalEffort.toFixed(0)} total effort days
            </p>
          </div>
          {!baseline?.is_locked && (
            <Button size="sm" onClick={() => setShowFeatureModal(true)}>
              + Add Feature
            </Button>
          )}
        </div>

        {(!baseline?.features || baseline.features.length === 0) ? (
          <p className="text-sm text-gray-500 py-4 text-center">No features yet. Add features to define your project scope.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-gray-400 text-xs uppercase">
                  <th className="text-left pb-2 font-medium">Feature</th>
                  <th className="text-left pb-2 font-medium">Effort (days)</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Start Date</th>
                  <th className="text-left pb-2 font-medium">Assignees</th>
                  {!baseline.is_locked && <th className="pb-2" />}
                </tr>
              </thead>
              <tbody>
                {baseline.features.map((f) => (
                  <FeatureRow
                    key={f.id}
                    feature={f}
                    projectId={id}
                    locked={baseline.is_locked}
                    members={members}
                    onDelete={handleDeleteFeature}
                    onRefresh={() => fetchBaseline(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Milestones</h2>
          {!baseline?.is_locked && (
            <Button size="sm" onClick={() => setShowMilestoneModal(true)}>
              + Add Milestone
            </Button>
          )}
        </div>

        {(!baseline?.milestones || baseline.milestones.length === 0) ? (
          <p className="text-sm text-gray-500 py-4 text-center">No milestones yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...baseline.milestones]
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-bg-elevated hover:bg-bg-border/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={m.is_completed}
                    onChange={() => handleToggleMilestone(m)}
                    className="w-4 h-4 accent-[#7EE787] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${m.is_completed ? 'line-through text-gray-500' : ''}`}>
                      {m.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(parseISO(m.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {m.is_completed && <Badge label="Done" color="green" />}
                  {!baseline.is_locked && (
                    <button
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Lock button */}
      {!baseline?.is_locked && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={handleLock}
            loading={locking}
            disabled={(baseline?.features.length ?? 0) === 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lock Baseline
          </Button>
        </div>
      )}

      {/* Add Feature Modal */}
      <Modal isOpen={showFeatureModal} onClose={() => setShowFeatureModal(false)} title="Add Feature" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Feature Name" placeholder="e.g. User Authentication" value={featureName} onChange={e => setFeatureName(e.target.value)} autoFocus />
          <Textarea label="Description" placeholder="What does this feature do?" value={featureDesc} onChange={e => setFeatureDesc(e.target.value)} rows={2} />
          <Input label="Effort (days)" type="number" min="0" step="0.5" placeholder="0" value={featureEffort} onChange={e => setFeatureEffort(e.target.value)} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowFeatureModal(false)}>Cancel</Button>
            <Button onClick={handleAddFeature} loading={savingFeature} disabled={!featureName.trim()}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal isOpen={showMilestoneModal} onClose={() => setShowMilestoneModal(false)} title="Add Milestone" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Milestone Name" placeholder="e.g. MVP Launch" value={milestoneName} onChange={e => setMilestoneName(e.target.value)} autoFocus />
          <Input label="Due Date" type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowMilestoneModal(false)}>Cancel</Button>
            <Button onClick={handleAddMilestone} loading={savingMilestone} disabled={!milestoneName.trim() || !milestoneDate}>Add</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

// ─── Inline-editable feature row ──────────────────────────────────────────────

function FeatureRow({
  feature, projectId, locked, members, onDelete, onRefresh,
}: {
  feature: Feature
  projectId: number
  locked: boolean
  members: ProjectMember[]
  onDelete: (id: number) => void
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close assignee dropdown on outside click
  useEffect(() => {
    if (!showAssigneeDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAssigneeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAssigneeDropdown])

  const patch = async (data: Partial<{ status: FeatureStatus; start_date: string | null; assignee_ids: number[] }>) => {
    setSaving(true)
    try {
      await baselineApi.updateFeature(projectId, feature.id, data)
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update feature.')
    } finally {
      setSaving(false)
    }
  }

  const handleAssigneeToggle = async (userId: number) => {
    const current = feature.assignee_ids ?? []
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId]
    await patch({ assignee_ids: updated })
  }

  const assignedMembers = members.filter(m => (feature.assignee_ids ?? []).includes(m.user_id))

  const statusColorClass: Record<FeatureStatus, string> = {
    planned:     'text-gray-400 border-gray-600 bg-gray-800/50',
    in_progress: 'text-blue-300 border-blue-600/50 bg-blue-900/30',
    completed:   'text-emerald-300 border-emerald-600/50 bg-emerald-900/30',
    removed:     'text-red-400 border-red-800/50 bg-red-900/20',
  }

  return (
    <tr className={`border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Name */}
      <td className="py-3 pr-4">
        <div>
          <p className="font-medium text-gray-100 text-sm leading-tight">{feature.name}</p>
          {feature.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{feature.description}</p>
          )}
        </div>
      </td>

      {/* Effort */}
      <td className="py-3 pr-4">
        <span className="text-accent-green font-semibold tabular-nums">{feature.effort_days}d</span>
      </td>

      {/* Status — always editable */}
      <td className="py-3 pr-4">
        <select
          value={feature.status}
          onChange={e => patch({ status: e.target.value as FeatureStatus })}
          disabled={saving}
          className={`text-xs rounded-lg px-2 py-1 border outline-none cursor-pointer transition-colors ${statusColorClass[feature.status]}`}
        >
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="removed">Removed</option>
        </select>
      </td>

      {/* Start Date — always editable */}
      <td className="py-3 pr-4">
        <input
          type="date"
          value={feature.start_date ?? ''}
          onChange={e => patch({ start_date: e.target.value || null })}
          disabled={saving}
          className="bg-bg-elevated text-xs rounded-lg px-2 py-1 border border-bg-border text-gray-300 outline-none cursor-pointer hover:border-gray-500 transition-colors"
          title="Set start date for roadmap positioning"
        />
      </td>

      {/* Assignees — always editable */}
      <td className="py-3 pr-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowAssigneeDropdown(v => !v)}
            disabled={saving || members.length === 0}
            className="flex items-center gap-1.5 group"
            title={members.length === 0 ? 'No project members yet' : 'Click to assign members'}
          >
            {assignedMembers.length > 0 ? (
              <>
                <div className="flex -space-x-1.5">
                  {assignedMembers.slice(0, 3).map(m => (
                    <div
                      key={m.user_id}
                      title={m.user.name}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-bg-surface"
                      style={{ backgroundColor: memberColor(m.user_id) }}
                    >
                      {initials(m.user.name)}
                    </div>
                  ))}
                  {assignedMembers.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-[9px] text-gray-400 ring-1 ring-bg-surface">
                      +{assignedMembers.length - 3}
                    </div>
                  )}
                </div>
                <svg className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-md border border-dashed transition-colors ${
                members.length === 0
                  ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-400 cursor-pointer'
              }`}>
                {members.length === 0 ? 'No members' : '+ Assign'}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showAssigneeDropdown && members.length > 0 && (
            <div className="absolute z-30 top-full left-0 mt-1.5 bg-bg-surface border border-bg-border rounded-xl shadow-2xl p-1.5 min-w-[200px]">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider px-2 py-1">Assign to</p>
              {members.map(m => {
                const checked = (feature.assignee_ids ?? []).includes(m.user_id)
                return (
                  <label
                    key={m.user_id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                      checked ? 'bg-emerald-500/10 text-emerald-300' : 'hover:bg-bg-elevated text-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleAssigneeToggle(m.user_id)}
                      className="w-3 h-3 accent-[#7EE787] shrink-0"
                    />
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: memberColor(m.user_id) }}
                    >
                      {initials(m.user.name)}
                    </div>
                    <span className="flex-1 font-medium truncate">{m.user.name}</span>
                    <span className={`text-[9px] px-1.5 py-px rounded-full ${
                      m.role === 'manager'     ? 'bg-emerald-500/20 text-emerald-400' :
                      m.role === 'stakeholder' ? 'bg-gray-500/20 text-gray-400' :
                                                 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {m.role}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </td>

      {/* Delete (only when unlocked) */}
      {!locked && (
        <td className="py-3">
          <button
            onClick={() => onDelete(feature.id)}
            className="text-gray-600 hover:text-red-400 transition-colors p-1"
            disabled={saving}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  )
}
