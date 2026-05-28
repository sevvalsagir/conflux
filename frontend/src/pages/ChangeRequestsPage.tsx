import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { timeAgoLong } from '../utils/time'
import { useCRStore } from '../store'
import { crApi } from '../api'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Input, Textarea, Select } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { CRStatusBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import type { CRType, CRStatus } from '../types'

const CR_TYPE_LABELS: Record<CRType, string> = {
  feature_add: 'Add Feature',
  feature_remove: 'Remove Feature',
  feature_modify: 'Modify Feature',
  timeline_change: 'Timeline Change',
  scope_change: 'Scope Change',
  other: 'Other',
}

const STATUS_FILTERS: { label: string; value: CRStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Done', value: 'done' },
]

export function ChangeRequestsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const { crs, fetchCRs, addCR } = useCRStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CRStatus | 'all'>('all')

  // Create CR modal
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [crType, setCRType] = useState<CRType>('other')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCRs(id).finally(() => setLoading(false))
  }, [id])

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return
    setCreating(true)
    try {
      const res = await crApi.create(id, title.trim(), description.trim(), crType)
      addCR(res.data)
      setShowModal(false)
      setTitle(''); setDescription(''); setCRType('other')
      navigate(`/projects/${id}/change-requests/${res.data.id}`)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create CR.')
    } finally {
      setCreating(false)
    }
  }

  const filtered = filter === 'all' ? crs : crs.filter(cr => cr.status === filter)

  if (loading) return <AppLayout title="Change Requests"><PageSpinner /></AppLayout>

  return (
    <AppLayout title="Change Requests" subtitle={`${crs.length} total`}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                  : 'bg-bg-elevated text-gray-400 border border-bg-border hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={() => setShowModal(true)}>
          + New CR
        </Button>
      </div>

      {/* CR list */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-400 text-sm">No change requests found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((cr) => (
            <button
              key={cr.id}
              onClick={() => navigate(`/projects/${id}/change-requests/${cr.id}`)}
              className="card p-4 text-left hover:border-accent-green/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-mono">CR-{cr.id}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{CR_TYPE_LABELS[cr.cr_type]}</span>
                  </div>
                  <h3 className="font-semibold mt-1 group-hover:text-accent-green transition-colors">
                    {cr.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{cr.description}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {cr.submitted_by.name} · {timeAgoLong(cr.created_at)}
                  </p>
                </div>
                <CRStatusBadge status={cr.status} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create CR Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Change Request" size="md">
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="Brief description of the change"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <Select
            label="Type"
            value={crType}
            onChange={e => setCRType(e.target.value as CRType)}
          >
            {Object.entries(CR_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Textarea
            label="Description"
            placeholder="Explain the change in detail. What should be changed and why?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!title.trim() || !description.trim()}>
              Create as Draft
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
