from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, schemas
from auth import get_current_user, get_member_role
from services.log_service import notify_user

router = APIRouter(prefix="/api/projects/{project_id}/messages", tags=["Messages"])


@router.get("", response_model=List[schemas.MessageOut])
def list_messages(
    project_id: int,
    recipient_id: Optional[int] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get messages for this project.
    - recipient_id=None  → general channel
    - recipient_id=X     → DM thread between current_user ↔ X
    """
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    q = db.query(models.Message).filter(models.Message.project_id == project_id)

    if recipient_id is None:
        # General channel — messages with no recipient
        q = q.filter(models.Message.recipient_id == None)
    else:
        # DM thread: both directions between current_user and recipient
        q = q.filter(
            (
                (models.Message.sender_id == current_user.id) &
                (models.Message.recipient_id == recipient_id)
            ) | (
                (models.Message.sender_id == recipient_id) &
                (models.Message.recipient_id == current_user.id)
            )
        )

    messages = q.order_by(models.Message.created_at.asc()).all()
    return messages


@router.post("", response_model=schemas.MessageOut)
def send_message(
    project_id: int,
    body: schemas.MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    if body.recipient_id is not None:
        # Validate recipient is a project member
        rec_role = get_member_role(project_id,
            db.query(models.User).filter(models.User.id == body.recipient_id).first(),
            db)
        if rec_role is None:
            raise HTTPException(status_code=400, detail="Recipient is not a project member.")

    msg = models.Message(
        project_id=project_id,
        sender_id=current_user.id,
        recipient_id=body.recipient_id,
        text=body.text,
    )
    db.add(msg)
    db.flush()

    # Notify recipient on DM
    if body.recipient_id is not None:
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        notify_user(
            db,
            user_id=body.recipient_id,
            notif_type="new_message",
            title=f"New DM from {current_user.name}",
            body=body.text[:120],
            project_id=project_id,
            reference_id=msg.id,
            reference_type="message",
        )

    db.commit()
    db.refresh(msg)
    return msg
