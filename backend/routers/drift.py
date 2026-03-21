from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, get_member_role
from services.drift_service import calculate_drift

router = APIRouter(prefix="/api/projects/{project_id}/drift", tags=["Drift"])


@router.get("", response_model=schemas.DriftOut)
def get_drift(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = get_member_role(project_id, current_user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Not a project member.")

    return calculate_drift(project_id, db)
