// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  name: string
  created_at: string
}

export type UserRole = 'manager' | 'member' | 'stakeholder'

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ProjectMember {
  id: number
  user_id: number
  role: UserRole
  user: User
}

export interface Project {
  id: number
  name: string
  description: string
  owner_id: number
  is_archived: boolean
  created_at: string
  members: ProjectMember[]
}

// ─── Baseline ─────────────────────────────────────────────────────────────────

export type FeatureStatus = 'planned' | 'in_progress' | 'completed' | 'removed'

export interface Feature {
  id: number
  name: string
  description: string
  effort_days: number
  status: FeatureStatus
  start_date?: string | null
  completed_at?: string | null
  assignee_ids?: number[]
  created_at: string
}

export interface Milestone {
  id: number
  name: string
  due_date: string
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

export interface Baseline {
  id: number
  project_id: number
  is_locked: boolean
  locked_at: string | null
  features: Feature[]
  milestones: Milestone[]
  created_at: string
}

// ─── Change Requests ──────────────────────────────────────────────────────────

export type CRStatus =
  | 'draft'
  | 'submitted'
  | 'analyzing'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'deferred'
  | 'in_progress'
  | 'done'

export type CRType =
  | 'feature_add'
  | 'feature_remove'
  | 'feature_modify'
  | 'timeline_change'
  | 'scope_change'
  | 'other'

export interface AIAnalysis {
  timeline_impact: string
  risk_score: number
  risk_level: 'Low' | 'Medium' | 'High'
  dependency_analysis: string
  alternative_suggestions: string
}

export interface CRComment {
  id: number
  user_id: number
  text: string
  created_at: string
  user: User
}

export interface ChangeRequest {
  id: number
  project_id: number
  title: string
  description: string
  cr_type: CRType
  status: CRStatus
  ai_analysis: AIAnalysis | null
  decision_note: string | null
  decided_at: string | null
  roadmap_start: string | null
  roadmap_end: string | null
  created_at: string
  updated_at: string
  submitted_by: User
  decided_by: User | null
  comments: CRComment[]
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface Message {
  id: number
  project_id: number
  sender_id: number
  recipient_id: number | null
  text: string
  created_at: string
  sender: User
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export interface Meeting {
  id: number
  project_id: number
  created_by_id: number
  title: string
  description: string | null
  meeting_date: string   // ISO datetime "2026-06-15T14:00"
  duration_minutes: number
  location: string | null
  created_at: string
  created_by: User
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotifType = 'new_message' | 'cr_status' | 'cr_comment' | 'meeting' | 'member' | 'feature'

export interface Notification {
  id: number
  user_id: number
  project_id: number | null
  notif_type: NotifType
  title: string
  body: string | null
  is_read: boolean
  reference_id: number | null
  reference_type: string | null
  created_at: string
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: number
  project_id: number
  user_id: number | null
  action_type: string
  description: string
  meta: Record<string, unknown> | null
  created_at: string
  user: User | null
}

// ─── Drift ────────────────────────────────────────────────────────────────────

export type DriftLevel = 'Low' | 'Moderate' | 'High' | 'Critical'

export interface DriftData {
  feature_drift: number
  effort_drift: number
  timeline_drift: number
  overall_drift: number
  drift_level: DriftLevel
  total_crs: number
  approved_crs: number
  pending_crs: number
  rejected_crs: number
}
