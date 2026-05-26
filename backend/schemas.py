from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime
from models import UserRole, CRStatus, CRType, FeatureStatus


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Project ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectMemberOut(BaseModel):
    id: int
    user_id: int
    role: UserRole
    user: UserOut

    class Config:
        from_attributes = True

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    owner_id: int
    is_archived: bool
    created_at: datetime
    members: List[ProjectMemberOut] = []

    class Config:
        from_attributes = True

class AddMemberRequest(BaseModel):
    email: str
    role: UserRole = UserRole.member


# ─── Baseline ─────────────────────────────────────────────────────────────────

class FeatureCreate(BaseModel):
    name: str
    description: str = ""
    effort_days: float = 0
    start_date: Optional[str] = None
    assignee_ids: Optional[List[int]] = []

class FeatureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    effort_days: Optional[float] = None
    status: Optional[FeatureStatus] = None
    start_date: Optional[str] = None
    completed_at: Optional[str] = None
    assignee_ids: Optional[List[int]] = None

class FeatureOut(BaseModel):
    id: int
    name: str
    description: str
    effort_days: float
    status: FeatureStatus
    start_date: Optional[str] = None
    completed_at: Optional[str] = None
    assignee_ids: List[int] = []
    created_at: datetime

    @field_validator('assignee_ids', mode='before')
    @classmethod
    def coerce_none_assignees(cls, v):
        return v if v is not None else []

    class Config:
        from_attributes = True

class MilestoneCreate(BaseModel):
    name: str
    due_date: str   # ISO date string e.g. "2024-12-31"

class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    due_date: Optional[str] = None
    is_completed: Optional[bool] = None

class MilestoneOut(BaseModel):
    id: int
    name: str
    due_date: str
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BaselineOut(BaseModel):
    id: int
    project_id: int
    is_locked: bool
    locked_at: Optional[datetime] = None
    features: List[FeatureOut] = []
    milestones: List[MilestoneOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Change Requests ──────────────────────────────────────────────────────────

class CRCreate(BaseModel):
    title: str
    description: str
    cr_type: CRType = CRType.other

class CRStatusUpdate(BaseModel):
    status: CRStatus
    decision_note: Optional[str] = None

class CRCommentOut(BaseModel):
    id: int
    user_id: int
    text: str
    created_at: datetime
    user: UserOut

    class Config:
        from_attributes = True

class CRCommentCreate(BaseModel):
    text: str

class CRRoadmapUpdate(BaseModel):
    roadmap_start: Optional[str] = None
    roadmap_end:   Optional[str] = None

class ChangeRequestOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    cr_type: CRType
    status: CRStatus
    ai_analysis: Optional[Any] = None
    decision_note: Optional[str] = None
    decided_at: Optional[datetime] = None
    roadmap_start: Optional[str] = None
    roadmap_end:   Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submitted_by: UserOut
    decided_by: Optional[UserOut] = None
    comments: List[CRCommentOut] = []

    class Config:
        from_attributes = True


# ─── Drift ────────────────────────────────────────────────────────────────────

class DriftOut(BaseModel):
    feature_drift: float      # 0-100 percentage
    effort_drift: float       # 0-100 percentage
    timeline_drift: float     # 0-100 percentage
    overall_drift: float      # weighted average
    drift_level: str          # Low / Moderate / High / Critical
    total_crs: int
    approved_crs: int
    pending_crs: int
    rejected_crs: int


# ─── Chat Messages ────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    text: str
    recipient_id: Optional[int] = None   # None = general chat

class MessageOut(BaseModel):
    id: int
    project_id: int
    sender_id: int
    recipient_id: Optional[int] = None
    text: str
    created_at: datetime
    sender: UserOut

    class Config:
        from_attributes = True


# ─── Meetings ─────────────────────────────────────────────────────────────────

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: str          # ISO datetime string "2026-06-15T14:00"
    duration_minutes: int = 60
    location: Optional[str] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    meeting_date: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None

class MeetingOut(BaseModel):
    id: int
    project_id: int
    created_by_id: int
    title: str
    description: Optional[str] = None
    meeting_date: str
    duration_minutes: int
    location: Optional[str] = None
    created_at: datetime
    created_by: UserOut

    class Config:
        from_attributes = True


# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: int
    project_id: Optional[int] = None
    notif_type: str
    title: str
    body: Optional[str] = None
    is_read: bool
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationCountOut(BaseModel):
    unread_count: int


# ─── Activity Log ─────────────────────────────────────────────────────────────

class ActivityLogOut(BaseModel):
    id: int
    project_id: int
    user_id: Optional[int] = None
    action_type: str
    description: str
    meta: Optional[Any] = None
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True
