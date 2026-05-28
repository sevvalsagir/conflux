from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models, schemas
from auth import get_current_user, get_member_role, require_manager
from services.log_service import log_activity, notify_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all projects the current user is a member of."""
    memberships = db.query(models.ProjectMember).filter(
        models.ProjectMember.user_id == current_user.id
    ).all()
    project_ids = [m.project_id for m in memberships]

    projects = db.query(models.Project).filter(
        models.Project.id.in_(project_ids),
        models.Project.is_archived == False
    ).all()
    return projects


@router.post("", response_model=schemas.ProjectOut)
def create_project(
    body: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new project. The creator automatically becomes the manager."""
    project = models.Project(
        name=body.name,
        description=body.description,
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()  # Get the ID before committing

    # Add creator as manager
    membership = models.ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=models.UserRole.manager,
    )
    db.add(membership)

    # Create an empty baseline for the project
    baseline = models.Baseline(project_id=project.id)
    db.add(baseline)

    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = _get_project_or_404(project_id, db)
    _check_membership(project_id, current_user, db)
    return project


@router.post("/{project_id}/members", response_model=schemas.ProjectMemberOut)
def add_member(
    project_id: int,
    body: schemas.AddMemberRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Only managers can add members."""
    _get_project_or_404(project_id, db)
    require_manager(project_id, current_user, db)

    # Find the user by email
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with that email not found.")

    # Check if already a member
    existing = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member.")

    membership = models.ProjectMember(
        project_id=project_id,
        user_id=user.id,
        role=body.role,
    )
    db.add(membership)
    db.flush()

    project = _get_project_or_404(project_id, db)
    log_activity(db, project_id, "member_added",
                 f"{current_user.name} added {user.name} as {body.role.value}",
                 user_id=current_user.id, meta={"new_user_id": user.id})

    notify_user(db, user.id, "member",
                f"You were added to project '{project.name}'",
                body=f"Role: {body.role.value}",
                project_id=project_id)

    db.commit()
    db.refresh(membership)
    return membership


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Only the project manager can delete (archive) a project."""
    require_manager(project_id, current_user, db)
    project = _get_project_or_404(project_id, db)
    project.is_archived = True
    db.commit()
    return {"message": "Project deleted."}


@router.delete("/{project_id}/members/{user_id}")
def remove_member(
    project_id: int,
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_manager(project_id, current_user, db)

    membership = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found.")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself.")

    removed_user = db.query(models.User).filter(models.User.id == user_id).first()
    log_activity(db, project_id, "member_removed",
                 f"{current_user.name} removed {removed_user.name if removed_user else user_id} from project",
                 user_id=current_user.id, meta={"removed_user_id": user_id})
    db.delete(membership)
    db.commit()
    return {"message": "Member removed."}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_project_or_404(project_id: int, db: Session) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


def _check_membership(project_id: int, user: models.User, db: Session):
    role = get_member_role(project_id, user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="You are not a member of this project.")
