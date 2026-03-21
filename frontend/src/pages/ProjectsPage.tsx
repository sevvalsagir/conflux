import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useProjectStore } from '../store'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { Header } from '../components/layout/Header'

export function ProjectsPage() {
  const { projects, fetchProjects, createProject } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const project = await createProject(name.trim(), description.trim())
      setShowModal(false)
      setName('')
      setDescription('')
      navigate(`/projects/${project.id}/dashboard`)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <Header title="Conflux" subtitle="Your Projects" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Projects</h2>
            <p className="text-sm text-gray-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Button>
        </div>

        {loading ? (
          <PageSpinner />
        ) : projects.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first project to start managing scope.</p>
            <Button onClick={() => setShowModal(true)}>Create Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/dashboard`)}
                className="card p-5 text-left hover:border-accent-green/30 hover:bg-bg-elevated transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-green/15 flex items-center justify-center text-accent-green font-bold text-lg">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-500">
                    {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="font-semibold group-hover:text-accent-green transition-colors">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                )}
                <p className="text-xs text-gray-600 mt-3">
                  Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Project" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Project Name"
            placeholder="e.g. E-Commerce Redesign"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            placeholder="What is this project about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!name.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
