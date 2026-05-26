from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user, get_member_role, require_manager
from services.log_service import log_activity, notify_project_members

router = APIRouter(prefix="/api/projects/{project_id}/meetings", tags=["Meetings"])


@router.get("", response_model=List[schemas.MeetingOut])
def list_meetings(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    meetings = (
        db.query(models.Meeting)
        .filter(models.Meeting.project_id == project_id)
        .order_by(models.Meeting.meeting_date.asc())
        .all()
    )
    return meetings


@router.post("", response_model=schemas.MeetingOut)
def create_meeting(
    project_id: int,
    body: schemas.MeetingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_manager(project_id, current_user, db)

    meeting = models.Meeting(
        project_id=project_id,
        created_by_id=current_user.id,
        title=body.title,
        description=body.description,
        meeting_date=body.meeting_date,
        duration_minutes=body.duration_minutes,
        location=body.location,
    )
    db.add(meeting)
    db.flush()

    log_activity(db, project_id, "meeting_scheduled",
                 f"Meeting scheduled: '{body.title}' on {body.meeting_date[:10]}",
                 user_id=current_user.id,
                 meta={"meeting_id": meeting.id, "date": body.meeting_date})

    notify_project_members(
        db, project_id,
        notif_type="meeting",
        title=f"Meeting scheduled: {body.title}",
        body=f"{body.meeting_date[:10]}" + (f" · {body.location}" if body.location else ""),
        exclude_user_id=current_user.id,
        reference_id=meeting.id,
        reference_type="meeting",
    )

    db.commit()
    db.refresh(meeting)
    return meeting


@router.patch("/{meeting_id}", response_model=schemas.MeetingOut)
def update_meeting(
    project_id: int,
    meeting_id: int,
    body: schemas.MeetingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_manager(project_id, current_user, db)
    meeting = _get_meeting_or_404(meeting_id, project_id, db)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(meeting, field, value)

    log_activity(db, project_id, "meeting_updated",
                 f"Meeting updated: '{meeting.title}'",
                 user_id=current_user.id)

    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(
    project_id: int,
    meeting_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_manager(project_id, current_user, db)
    meeting = _get_meeting_or_404(meeting_id, project_id, db)

    log_activity(db, project_id, "meeting_deleted",
                 f"Meeting deleted: '{meeting.title}'",
                 user_id=current_user.id)

    db.delete(meeting)
    db.commit()


def _get_meeting_or_404(meeting_id: int, project_id: int, db: Session) -> models.Meeting:
    m = db.query(models.Meeting).filter(
        models.Meeting.id == meeting_id,
        models.Meeting.project_id == project_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return m
