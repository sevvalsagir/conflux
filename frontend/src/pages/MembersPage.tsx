import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore, useAuthStore } from '../store'
import { projectsApi } from '../api'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import type { UserRole } from '../types'

const ROLE_COLORS: Record<UserRole, 'green' | 'blue' | 'gray'> = {
  manager: 'green', member: 'blue', stakeholder: 'gray'
}

export function MembersPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const { currentProject, fetchProject } = useProjectStore()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProject(id).finally(() => setLoading(false))
  }, [id])

  const myRole = currentProject?.members.find(m => m.user_id === user?.id)?.role
  const isManager = myRole === 'manager'

  const handleAdd = async () => {
    if (!email.trim()) return
    setAdding(true)
    setError('')
    try {
      await projectsApi.addMember(id, email.trim(), role)
      await fetchProject(id)
      setShowModal(false)
      setEmail('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add member.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (userId: number) => {
    if (!confirm('Remove this member?')) return
    try {
      await projectsApi.removeMember(id, userId)
      await fetchProject(id)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove member.')
    }
  }

  if (loading) return <AppLayout title="Team"><PageSpinner /></AppLayout>

  return (
    <AppLayout title="Team" subtitle={`${currentProject?.members.length ?? 0} members`}>
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-400">
            Manage who has access to this project and their roles.
          </p>
          {isManager && (
            <Button size="sm" onClick={() => setShowModal(true)}>
              + Add Member
            </Button>
          )}
        </div>

        <div className="card divide-y divide-bg-border">
          {currentProject?.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center font-semibold text-sm">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{m.user.name}</p>
                    {m.user_id === user?.id && (
                      <span className="text-xs text-gray-500">(you)</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={m.role} color={ROLE_COLORS[m.role]} />
                {isManager && m.user_id !== user?.id && (
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Team Member" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
          <Select
            label="Role"
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
          >
            <option value="member">Member — can submit CRs</option>
            <option value="manager">Manager — can approve CRs</option>
            <option value="stakeholder">Stakeholder — read only</option>
          </Select>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={adding} disabled={!email.trim()}>Add</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
