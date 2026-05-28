import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDate, fmtDateTime } from '../utils/time'
import { useCRStore, useAuthStore, useProjectStore } from '../store'
import { crApi } from '../api'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Input'
import { CRStatusBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import type { CRStatus } from '../types'

const CR_TYPE_LABELS: Record<string, string> = {
  feature_add: 'Add Feature', feature_remove: 'Remove Feature',
  feature_modify: 'Modify Feature', timeline_change: 'Timeline Change',
  scope_change: 'Scope Change', other: 'Other',
}

export function CRDetailPage() {
  const { projectId, crId } = useParams<{ projectId: string; crId: string }>()
  const pId = Number(projectId), cId = Number(crId)
  const { currentCR, fetchCR, updateCR } = useCRStore()
  const { user } = useAuthStore()
  const { currentProject, fetchProject } = useProjectStore()
  const [loading, setLoading] = useState(true)

  // Comment form
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Status transition
  const [decisionNote, setDecisionNote] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [showDecisionInput, setShowDecisionInput] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<CRStatus | null>(null)

  useEffect(() => {
    Promise.all([fetchCR(pId, cId), fetchProject(pId)]).finally(() => setLoading(false))
  }, [pId, cId])

  const myRole = currentProject?.members.find(m => m.user_id === user?.id)?.role

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      await crApi.addComment(pId, cId, commentText.trim())
      await fetchCR(pId, cId)
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleTransition = async (status: CRStatus) => {
    const needsNote = ['approved', 'rejected', 'deferred'].includes(status)
    if (needsNote) {
      setPendingStatus(status)
      setShowDecisionInput(true)
      return
    }
    await doTransition(status)
  }

  const doTransition = async (status: CRStatus, note?: string) => {
    setTransitioning(true)
    try {
      const res = await crApi.updateStatus(pId, cId, status, note)
      updateCR(res.data)
      setShowDecisionInput(false)
      setDecisionNote('')
      setPendingStatus(null)
      // Poll until AI analysis completes
      if (status === 'submitted') {
        setTimeout(() => fetchCR(pId, cId), 3000)
        setTimeout(() => fetchCR(pId, cId), 8000)
        setTimeout(() => fetchCR(pId, cId), 15000)
        setTimeout(() => fetchCR(pId, cId), 25000)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Transition failed.')
    } finally {
      setTransitioning(false)
    }
  }

  if (loading || !currentCR) return <AppLayout title="Change Request"><PageSpinner /></AppLayout>

  const cr = currentCR
  const isManager = myRole === 'manager'
  const isMine = cr.submitted_by.id === user?.id

  // Which action buttons to show
  const actions: { label: string; status: CRStatus; variant?: 'primary' | 'secondary' | 'danger' }[] = []
  if (isMine && cr.status === 'draft') {
    actions.push({ label: 'Submit for Review', status: 'submitted', variant: 'primary' })
  }
  if (isManager && cr.status === 'under_review') {
    actions.push({ label: 'Approve', status: 'approved', variant: 'primary' })
    actions.push({ label: 'Reject', status: 'rejected', variant: 'danger' })
    actions.push({ label: 'Defer', status: 'deferred', variant: 'secondary' })
  }
  if (isManager && cr.status === 'approved') {
    actions.push({ label: 'Mark In Progress', status: 'in_progress', variant: 'primary' })
  }
  if (isManager && cr.status === 'in_progress') {
    actions.push({ label: 'Mark Done', status: 'done', variant: 'primary' })
  }

  return (
    <AppLayout title={`CR-${cr.id}`} subtitle={cr.title}>
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        {/* Header card */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <span className="font-mono">CR-{cr.id}</span>
                <span>·</span>
                <span>{CR_TYPE_LABELS[cr.cr_type]}</span>
                <span>·</span>
                <span>by {cr.submitted_by.name}</span>
                <span>·</span>
                <span>{fmtDate(cr.created_at)}</span>
              </div>
              <h2 className="text-xl font-bold">{cr.title}</h2>
            </div>
            <CRStatusBadge status={cr.status} />
          </div>

          <p className="mt-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cr.description}</p>

          {/* Status badge for analyzing */}
          {cr.status === 'analyzing' && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <svg className="w-4 h-4 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-purple-400">AI is analyzing this change request…</p>
            </div>
          )}

          {/* Action buttons */}
          {actions.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {actions.map((a) => (
                <Button
                  key={a.status}
                  variant={a.variant}
                  size="sm"
                  onClick={() => handleTransition(a.status)}
                  loading={transitioning}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}

          {/* Decision note input */}
          {showDecisionInput && pendingStatus && (
            <div className="mt-4 flex flex-col gap-3 p-4 bg-bg-elevated rounded-xl border border-bg-border">
              <p className="text-sm font-medium">
                {pendingStatus === 'approved' ? 'Approval' : pendingStatus === 'rejected' ? 'Rejection' : 'Deferral'} Note
              </p>
              <Textarea
                placeholder="Provide your reasoning…"
                value={decisionNote}
                onChange={e => setDecisionNote(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={pendingStatus === 'rejected' ? 'danger' : 'primary'}
                  onClick={() => doTransition(pendingStatus, decisionNote)}
                  loading={transitioning}
                  disabled={!decisionNote.trim()}
                >
                  Confirm {pendingStatus}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowDecisionInput(false); setPendingStatus(null) }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis */}
        {cr.ai_analysis && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm">AI Impact Analysis</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                cr.ai_analysis.risk_level === 'High' ? 'bg-red-500/20 text-red-400' :
                cr.ai_analysis.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {cr.ai_analysis.risk_level} Risk
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoBlock label="Timeline Impact" value={cr.ai_analysis.timeline_impact} />
              <InfoBlock label="Risk Score" value={`${(cr.ai_analysis.risk_score * 100).toFixed(0)} / 100`} />
              <InfoBlock label="Dependencies" value={cr.ai_analysis.dependency_analysis} />
              {cr.ai_analysis.alternative_suggestions && (
                <InfoBlock label="Suggestions" value={cr.ai_analysis.alternative_suggestions} />
              )}
            </div>
          </div>
        )}

        {/* Decision */}
        {cr.decision_note && (
          <div className={`card p-5 border-l-4 ${
            cr.status === 'approved' ? 'border-l-accent-green' :
            cr.status === 'rejected' ? 'border-l-red-500' : 'border-l-accent-orange'
          }`}>
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-medium">
              {cr.status} by {cr.decided_by?.name}
              {cr.decided_at ? ` · ${fmtDate(cr.decided_at)}` : ''}
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{cr.decision_note}</p>
          </div>
        )}

        {/* Comments */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Discussion ({cr.comments.length})</h3>

          <div className="flex flex-col gap-3 mb-4">
            {cr.comments.length === 0 && (
              <p className="text-sm text-gray-500">No comments yet.</p>
            )}
            {cr.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center text-xs font-semibold shrink-0">
                  {c.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{c.user.name}</span>
                    <span className="text-xs text-gray-500">{fmtDateTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Textarea
              placeholder="Add a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSubmitComment} loading={submittingComment} disabled={!commentText.trim()}>
                Comment
              </Button>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-elevated rounded-lg p-3">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
