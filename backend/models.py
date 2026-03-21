from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


# ─── Enums ───────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    manager = "manager"
    member = "member"
    stakeholder = "stakeholder"


class CRStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    analyzing = "analyzing"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    deferred = "deferred"
    in_progress = "in_progress"
    done = "done"


class CRType(str, enum.Enum):
    feature_add = "feature_add"
    feature_remove = "feature_remove"
    feature_modify = "feature_modify"
    timeline_change = "timeline_change"
    scope_change = "scope_change"
    other = "other"


class FeatureStatus(str, enum.Enum):
    planned = "planned"
    in_progress = "in_progress"
    completed = "completed"
    removed = "removed"


# ─── Models ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    owned_projects = relationship("Project", back_populates="owner")
    memberships = relationship("ProjectMember", back_populates="user")
    submitted_crs = relationship("ChangeRequest", back_populates="submitted_by")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_projects")
    members = relationship("ProjectMember", back_populates="project")
    baseline = relationship("Baseline", back_populates="project", uselist=False)
    change_requests = relationship("ChangeRequest", back_populates="project")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.member, nullable=False)
    joined_at = Column(DateTime, server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Baseline(Base):
    __tablename__ = "baselines"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False)
    is_locked = Column(Boolean, default=False)
    locked_at = Column(DateTime, nullable=True)
    # Snapshot stored when baseline is locked — JSON of features + milestones
    snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="baseline")
    features = relationship("Feature", back_populates="baseline", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="baseline", cascade="all, delete-orphan")


class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True)
    baseline_id = Column(Integer, ForeignKey("baselines.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    effort_days = Column(Float, default=0)
    status = Column(Enum(FeatureStatus), default=FeatureStatus.planned)
    created_at = Column(DateTime, server_default=func.now())

    baseline = relationship("Baseline", back_populates="features")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    baseline_id = Column(Integer, ForeignKey("baselines.id"), nullable=False)
    name = Column(String, nullable=False)
    due_date = Column(String, nullable=False)   # stored as ISO date string for simplicity
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    baseline = relationship("Baseline", back_populates="milestones")


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    cr_type = Column(Enum(CRType), default=CRType.other)
    status = Column(Enum(CRStatus), default=CRStatus.draft)

    # AI analysis result stored as JSON
    ai_analysis = Column(JSON, nullable=True)

    # Manager decision
    decision_note = Column(Text, nullable=True)
    decided_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="change_requests")
    submitted_by = relationship("User", back_populates="submitted_crs", foreign_keys=[submitted_by_id])
    decided_by = relationship("User", foreign_keys=[decided_by_id])
    comments = relationship("CRComment", back_populates="cr", cascade="all, delete-orphan")


class CRComment(Base):
    __tablename__ = "cr_comments"

    id = Column(Integer, primary_key=True, index=True)
    cr_id = Column(Integer, ForeignKey("change_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    cr = relationship("ChangeRequest", back_populates="comments")
    user = relationship("User")
