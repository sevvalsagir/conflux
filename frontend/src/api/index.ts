import client from './client'
import type {
  User, Project, Baseline, Feature, Milestone,
  ChangeRequest, CRComment, DriftData, UserRole, CRStatus, CRType, FeatureStatus,
  Message, Meeting, Notification, ActivityLog,
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

  delete: (id: number) =>
    client.delete(`/projects/${id}`),

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

  updateFeature: (projectId: number, featureId: number, data: Partial<{ name: string; description: string; effort_days: number; status: FeatureStatus; start_date: string | null; completed_at: string | null; assignee_ids: number[] }>) =>
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

  updateRoadmap: (projectId: number, crId: number, data: Partial<{ roadmap_start: string | null; roadmap_end: string | null }>) =>
    client.patch<ChangeRequest>(`/projects/${projectId}/change-requests/${crId}/roadmap`, data),

  addComment: (projectId: number, crId: number, text: string) =>
    client.post<CRComment>(`/projects/${projectId}/change-requests/${crId}/comments`, { text }),
}

// ─── Drift ────────────────────────────────────────────────────────────────────

export const driftApi = {
  get: (projectId: number) =>
    client.get<DriftData>(`/projects/${projectId}/drift`),
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  list: (projectId: number, recipientId?: number) =>
    client.get<Message[]>(`/projects/${projectId}/messages`, {
      params: recipientId !== undefined ? { recipient_id: recipientId } : {},
    }),

  send: (projectId: number, text: string, recipientId?: number) =>
    client.post<Message>(`/projects/${projectId}/messages`, {
      text,
      recipient_id: recipientId ?? null,
    }),
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export const meetingsApi = {
  list: (projectId: number) =>
    client.get<Meeting[]>(`/projects/${projectId}/meetings`),

  create: (projectId: number, data: {
    title: string; description?: string; meeting_date: string;
    duration_minutes?: number; location?: string
  }) =>
    client.post<Meeting>(`/projects/${projectId}/meetings`, data),

  update: (projectId: number, meetingId: number, data: Partial<{
    title: string; description: string; meeting_date: string;
    duration_minutes: number; location: string
  }>) =>
    client.patch<Meeting>(`/projects/${projectId}/meetings/${meetingId}`, data),

  delete: (projectId: number, meetingId: number) =>
    client.delete(`/projects/${projectId}/meetings/${meetingId}`),
}

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () =>
    client.get<Notification[]>('/notifications'),

  count: () =>
    client.get<{ unread_count: number }>('/notifications/count'),

  markRead: (id: number) =>
    client.patch<Notification>(`/notifications/${id}/read`),

  markAllRead: () =>
    client.post('/notifications/read-all'),
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export const activityApi = {
  list: (projectId: number) =>
    client.get<ActivityLog[]>(`/projects/${projectId}/activity`),
}
