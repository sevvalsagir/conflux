import client from './client'
import type {
  User, Project, Baseline, Feature, Milestone,
  ChangeRequest, CRComment, DriftData, UserRole, CRStatus, CRType, FeatureStatus
} from '../types'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, name: string, password: string) =>
    client.post<{ access_token: string }>('/auth/register', { email, name, password }),

  login: (email: string, password: string) =>
    client.post<{ access_token: string }>('/auth/login', { email, password }),

  me: () =>
    client.get<User>('/auth/me'),
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () =>
    client.get<Project[]>('/projects'),

  create: (name: string, description: string) =>
    client.post<Project>('/projects', { name, description }),

  get: (id: number) =>
    client.get<Project>(`/projects/${id}`),

  addMember: (projectId: number, email: string, role: UserRole) =>
    client.post(`/projects/${projectId}/members`, { email, role }),

  removeMember: (projectId: number, userId: number) =>
    client.delete(`/projects/${projectId}/members/${userId}`),
}

// ─── Baseline ─────────────────────────────────────────────────────────────────

export const baselineApi = {
  get: (projectId: number) =>
    client.get<Baseline>(`/projects/${projectId}/baseline`),

  lock: (projectId: number) =>
    client.post(`/projects/${projectId}/baseline/lock`),

  addFeature: (projectId: number, name: string, description: string, effort_days: number) =>
    client.post<Feature>(`/projects/${projectId}/baseline/features`, { name, description, effort_days }),

  updateFeature: (projectId: number, featureId: number, data: Partial<{ name: string; description: string; effort_days: number; status: FeatureStatus }>) =>
    client.patch<Feature>(`/projects/${projectId}/baseline/features/${featureId}`, data),

  deleteFeature: (projectId: number, featureId: number) =>
    client.delete(`/projects/${projectId}/baseline/features/${featureId}`),

  addMilestone: (projectId: number, name: string, due_date: string) =>
    client.post<Milestone>(`/projects/${projectId}/baseline/milestones`, { name, due_date }),

  updateMilestone: (projectId: number, milestoneId: number, data: Partial<{ name: string; due_date: string; is_completed: boolean }>) =>
    client.patch<Milestone>(`/projects/${projectId}/baseline/milestones/${milestoneId}`, data),

  deleteMilestone: (projectId: number, milestoneId: number) =>
    client.delete(`/projects/${projectId}/baseline/milestones/${milestoneId}`),
}

// ─── Change Requests ──────────────────────────────────────────────────────────

export const crApi = {
  list: (projectId: number) =>
    client.get<ChangeRequest[]>(`/projects/${projectId}/change-requests`),

  create: (projectId: number, title: string, description: string, cr_type: CRType) =>
    client.post<ChangeRequest>(`/projects/${projectId}/change-requests`, { title, description, cr_type }),

  get: (projectId: number, crId: number) =>
    client.get<ChangeRequest>(`/projects/${projectId}/change-requests/${crId}`),

  updateStatus: (projectId: number, crId: number, status: CRStatus, decision_note?: string) =>
    client.patch<ChangeRequest>(`/projects/${projectId}/change-requests/${crId}/status`, { status, decision_note }),

  addComment: (projectId: number, crId: number, text: string) =>
    client.post<CRComment>(`/projects/${projectId}/change-requests/${crId}/comments`, { text }),
}

// ─── Drift ────────────────────────────────────────────────────────────────────

export const driftApi = {
  get: (projectId: number) =>
    client.get<DriftData>(`/projects/${projectId}/drift`),
}
