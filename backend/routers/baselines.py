from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import get_db
import models, schemas
from auth import get_current_user, get_member_role, require_manager, require_member_or_manager

router = APIRouter(prefix="/api/projects/{project_id}/baseline", tags=["Baseline"])


def _get_baseline_or_404(project_id: int, db: Session) -> models.Baseline:
    baseline = db.query(models.Baseline).filter(
        models.Baseline.project_id == project_id
    ).first()
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline not found.")
    return baseline


def _check_not_locked(baseline: models.Baseline):
    if baseline.is_locked:
        raise HTTPException(
            status_code=400,
            detail="Baseline is locked. Use a Change Request to modify the project."
        )


# ─── Baseline info ────────────────────────────────────────────────────────────

@router.get("", response_model=schemas.BaselineOut)
def get_baseline(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")
    return _get_baseline_or_404(project_id, db)


@router.post("/lock")
def lock_baseline(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lock the baseline. Only the manager can do this."""
    require_manager(project_id, current_user, db)
    baseline = _get_baseline_or_404(project_id, db)

    if baseline.is_locked:
        raise HTTPException(status_code=400, detail="Baseline is already locked.")

    # Serialize current state into snapshot
    features_snap = [
        {"id": f.id, "name": f.name, "description": f.description,
         "effort_days": f.effort_days, "status": f.status.value}
        for f in baseline.features
    ]
    milestones_snap = [
        {"id": m.id, "name": m.name, "due_date": m.due_date, "is_completed": m.is_completed}
        for m in baseline.milestones
    ]

    baseline.is_locked = True
    baseline.locked_at = datetime.utcnow()
    baseline.snapshot = {"features": features_snap, "milestones": milestones_snap}

    db.commit()
    return {"message": "Baseline locked successfully."}


# ─── Features ─────────────────────────────────────────────────────────────────

@router.post("/features", response_model=schemas.FeatureOut)
def add_feature(
    project_id: int,
    body: schemas.FeatureCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_member_or_manager(project_id, current_user, db)
    baseline = _get_baseline_or_404(project_id, db)
    _check_not_locked(baseline)

    feature = models.Feature(
        baseline_id=baseline.id,
        name=body.name,
        description=body.description,
        effort_days=body.effort_days,
    )
    db.add(feature)
    db.commit()
    db.refresh(feature)
    return feature


@router.patch("/features/{feature_id}", response_model=schemas.FeatureOut)
def update_feature(
    project_id: int,
    feature_id: int,
    body: schemas.FeatureUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_member_or_manager(project_id, current_user, db)
    baseline = _get_baseline_or_404(project_id, db)
    _check_not_locked(baseline)

    feature = db.query(models.Feature).filter(
        models.Feature.id == feature_id,
        models.Feature.baseline_id == baseline.id
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(feature, field, value)

    db.commit()
    db.refresh(feature)
    return feature


@router.delete("/features/{feature_id}")
def delete_feature(
    project_id: int,
    feature_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_member_or_manager(project_id, current_user, db)
    baseline = _get_baseline_or_404(project_id, db)
    _check_not_locked(baseline)

    feature = db.query(models.Feature).filter(
        models.Feature.id == feature_id,
        models.Feature.baseline_id == baseline.id
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found.")

    db.delete(feature)
    db.commit()
    return {"message": "Feature deleted."}


# ─── Milestones ───────────────────────────────────────────────────────────────

@router.post("/milestones", response_model=schemas.MilestoneOut)
def add_milestone(
    project_id: int,
    body: schemas.MilestoneCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_member_or_manager(project_id, current_user, db)
    baseline = _get_baseline_or_404(project_id, db)
    _check_not_locked(baseline)

    milestone = models.Milestone(
        baseline_id=baseline.id,
        name=body.name,
        due_date=body.due_date,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.patch("/milestones/{milestone_id}", response_model=schemas.MilestoneOut)
def update_milestone(
    project_id: int,
    milestone_id: int,
    body: schemas.MilestoneUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_member_or_manager(project_id, current_user, db)
    baseline = _get_baseline_or_404(project_id, db)

    # Allow marking milestones complete even after lock
    milestone = db.query(models.Milestone).filter(
        models.Milestone.id == milestone_id,
        models.Milestone.baseline_id == baseline.id
    ).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    # Only manager can change name/date after lock
    if baseline.is_locked and (body.name is not None or body.due_date is not None):
        _check_not_locked(baseline)

    if body.name is not None:
        milestone.name = body.name
    if body.due_date is not None:
        milestone.due_date = body.due_date
    if body.is_completed is not None:
        milestone.is_completed = body.is_completed
        if body.is_completed:
            milestone.completed_at = datetime.utcnow()
        else:
            milestone.completed_at = None

    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/milestones/{milestone_id}")
def delete_milestone(
    project_id: int,
    milestone_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_member_or_manager(project_id, current_user, db)
    baseline = _get_baseline_or_404(project_id, db)
    _check_not_locked(baseline)

    milestone = db.query(models.Milestone).filter(
        models.Milestone.id == milestone_id,
        models.Milestone.baseline_id == baseline.id
    ).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    db.delete(milestone)
    db.commit()
    return {"message": "Milestone deleted."}
