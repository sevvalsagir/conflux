"""
Helper functions for creating activity log entries and notifications.
Import and call these from any router when state changes.
"""
from sqlalchemy.orm import Session
import models


def log_activity(
    db: Session,
    project_id: int,
    action_type: str,
    description: str,
    user_id: int | None = None,
    meta: dict | None = None,
):
    """Insert one activity log row. Call db.commit() in the caller."""
    entry = models.ActivityLog(
        project_id=project_id,
        user_id=user_id,
        action_type=action_type,
        description=description,
        meta=meta or {},
    )
    db.add(entry)


def notify_user(
    db: Session,
    user_id: int,
    notif_type: str,
    title: str,
    body: str | None = None,
    project_id: int | None = None,
    reference_id: int | None = None,
    reference_type: str | None = None,
):
    """Insert one notification row. Call db.commit() in the caller."""
    notif = models.Notification(
        user_id=user_id,
        project_id=project_id,
        notif_type=notif_type,
        title=title,
        body=body,
        reference_id=reference_id,
        reference_type=reference_type,
    )
    db.add(notif)


def notify_project_members(
    db: Session,
    project_id: int,
    notif_type: str,
    title: str,
    body: str | None = None,
    exclude_user_id: int | None = None,
    reference_id: int | None = None,
    reference_type: str | None = None,
):
    """Notify every member of the project (optionally excluding one user)."""
    members = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id
    ).all()
    for m in members:
        if m.user_id == exclude_user_id:
            continue
        notify_user(
            db, m.user_id, notif_type, title, body,
            project_id=project_id,
            reference_id=reference_id,
            reference_type=reference_type,
        )
