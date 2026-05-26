from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user, get_member_role, require_manager, require_member_or_manager
from services.ai_service import analyze_change_request
from services.drift_service import calculate_drift

router = APIRouter(prefix="/api/projects/{project_id}/change-requests", tags=["Change Requests"])

# ─── Valid state transitions ──────────────────────────────────────────────────
# Map: current_status -> list of allowed next statuses (per role)
MANAGER_TRANSITIONS = {
    models.CRStatus.under_review: [
        models.CRStatus.approved,
        models.CRStatus.rejected,
        models.CRStatus.deferred,
    ],
    models.CRStatus.approved: [models.CRStatus.in_progress],
    models.CRStatus.in_progress: [models.CRStatus.done],
}

MEMBER_TRANSITIONS = {
    models.CRStatus.draft: [models.CRStatus.submitted],
}


def _is_valid_transition(current: models.CRStatus, next_status: models.CRStatus, role: models.UserRole) -> bool:
    if role == models.UserRole.manager:
        allowed = MANAGER_TRANSITIONS.get(current, [])
    else:
        allowed = MEMBER_TRANSITIONS.get(current, [])
    return next_status in allowed


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.ChangeRequestOut])
def list_crs(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    crs = db.query(models.ChangeRequest).filter(
        models.ChangeRequest.project_id == project_id
    ).order_by(models.ChangeRequest.created_at.desc()).all()
    return crs


@router.post("", response_model=schemas.ChangeRequestOut)
def create_cr(
    project_id: int,
    body: schemas.CRCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_member_or_manager(project_id, current_user, db)

    cr = models.ChangeRequest(
        project_id=project_id,
        submitted_by_id=current_user.id,
        title=body.title,
        description=body.description,
        cr_type=body.cr_type,
        status=models.CRStatus.draft,
    )
    db.add(cr)
    db.commit()
    db.refresh(cr)
    return cr


@router.get("/{cr_id}", response_model=schemas.ChangeRequestOut)
def get_cr(
    project_id: int,
    cr_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    cr = _get_cr_or_404(cr_id, project_id, db)
    return cr


@router.patch("/{cr_id}/status", response_model=schemas.ChangeRequestOut)
async def update_cr_status(
    project_id: int,
    cr_id: int,
    body: schemas.CRStatusUpdate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    cr = _get_cr_or_404(cr_id, project_id, db)

    # Validate transition
    if not _is_valid_transition(cr.status, body.status, role):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {cr.status.value} → {body.status.value} for role {role.value}"
        )

    # Manager must provide a note when approving/rejecting/deferring
    if body.status in (models.CRStatus.approved, models.CRStatus.rejected, models.CRStatus.deferred):
        if not body.decision_note:
            raise HTTPException(status_code=400, detail="Decision note is required.")
        cr.decision_note = body.decision_note
        cr.decided_by_id = current_user.id
        cr.decided_at = datetime.utcnow()

    cr.status = body.status
    db.commit()

    # When a CR is submitted → trigger AI analysis in the background
    if body.status == models.CRStatus.submitted:
        cr.status = models.CRStatus.analyzing
        db.commit()
        background_tasks.add_task(_run_ai_analysis, cr_id, project_id)

    db.refresh(cr)
    return cr


@router.patch("/{cr_id}/roadmap", response_model=schemas.ChangeRequestOut)
def update_cr_roadmap(
    project_id: int,
    cr_id: int,
    body: schemas.CRRoadmapUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update roadmap display dates for a CR (start / end for the Gantt bar)."""
    require_member_or_manager(project_id, current_user, db)
    cr = _get_cr_or_404(cr_id, project_id, db)
    if body.roadmap_start is not None:
        cr.roadmap_start = body.roadmap_start or None   # "" clears the field
    if body.roadmap_end is not None:
        cr.roadmap_end = body.roadmap_end or None
    db.commit()
    db.refresh(cr)
    return cr


@router.post("/{cr_id}/comments", response_model=schemas.CRCommentOut)
def add_comment(
    project_id: int,
    cr_id: int,
    body: schemas.CRCommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    _get_cr_or_404(cr_id, project_id, db)

    comment = models.CRComment(
        cr_id=cr_id,
        user_id=current_user.id,
        text=body.text,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


# ─── Background AI Task ───────────────────────────────────────────────────────

def _run_ai_analysis(cr_id: int, project_id: int):
    """
    Sync background task — runs in FastAPI's anyio thread pool.
    Uses asyncio.run() to call the async AI service safely from this worker thread
    (no event loop conflict since thread pool threads don't have a running loop).
    """
    import asyncio
    from database import SessionLocal

    # ── Step 1: read CR + baseline data (own session, close before AI call) ──
    cr_title = cr_description = ""
    context: dict = {}
    try:
        db = SessionLocal()
        cr = db.query(models.ChangeRequest).filter(
            models.ChangeRequest.id == cr_id
        ).first()
        if not cr:
            db.close()
            return
        cr_title       = cr.title
        cr_description = cr.description

        baseline = db.query(models.Baseline).filter(
            models.Baseline.project_id == project_id
        ).first()
        if baseline:
            context = {
                "features": [
                    {
                        "name": f.name,
                        "effort_days": f.effort_days,
                        "status": f.status.value,
                    }
                    for f in baseline.features
                ],
                "milestones": [
                    {"name": m.name, "due_date": m.due_date}
                    for m in baseline.milestones
                ],
            }
        db.close()
    except Exception as e:
        print(f"[AI] DB read error for CR {cr_id}: {e}")

    # ── Step 2: call AI via the proven async service ──────────────────────────
    analysis = None
    try:
        analysis = asyncio.run(
            analyze_change_request(cr_title, cr_description, context)
        )
        if analysis:
            print(f"[AI] CR {cr_id} analysis complete — risk: {analysis.get('risk_level')}")
        else:
            print(f"[AI] CR {cr_id} — AI returned None (timeout or key missing)")
    except Exception as e:
        print(f"[AI] CR {cr_id} analysis failed: {e}")

    # ── Step 3: write result back with a fresh session ────────────────────────
    try:
        db = SessionLocal()
        cr = db.query(models.ChangeRequest).filter(
            models.ChangeRequest.id == cr_id
        ).first()
        if cr:
            if analysis:
                cr.ai_analysis = analysis
            cr.status = models.CRStatus.under_review
            db.commit()
            print(f"[AI] CR {cr_id} → under_review (ai_analysis={'set' if analysis else 'null'})")
        db.close()
    except Exception as e:
        print(f"[AI] DB write error for CR {cr_id}: {e}")


# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_cr_or_404(cr_id: int, project_id: int, db: Session) -> models.ChangeRequest:
    cr = db.query(models.ChangeRequest).filter(
        models.ChangeRequest.id == cr_id,
        models.ChangeRequest.project_id == project_id
    ).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found.")
    return cr
