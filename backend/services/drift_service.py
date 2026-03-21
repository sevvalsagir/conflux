from typing import Optional
from sqlalchemy.orm import Session
import models


def calculate_drift(project_id: int, db: Session) -> dict:
    """
    Calculates how much the project has drifted from its baseline.

    Weights (from SRS):
        Feature Drift  — 40%
        Effort Drift   — 35%
        Timeline Drift — 25%
    """
    baseline = db.query(models.Baseline).filter(
        models.Baseline.project_id == project_id
    ).first()

    # If no locked baseline, drift is 0
    if not baseline or not baseline.is_locked or not baseline.snapshot:
        return _empty_drift(project_id, db)

    snapshot = baseline.snapshot
    snap_features = snapshot.get("features", [])
    snap_milestones = snapshot.get("milestones", [])

    # Current state
    current_features = db.query(models.Feature).filter(
        models.Feature.baseline_id == baseline.id
    ).all()
    current_milestones = db.query(models.Milestone).filter(
        models.Milestone.baseline_id == baseline.id
    ).all()

    # 1. Feature Drift — how many features were added/removed vs snapshot
    snap_feature_names = {f["name"] for f in snap_features}
    current_feature_names = {f.name for f in current_features}

    # Features added or removed
    added = current_feature_names - snap_feature_names
    removed = snap_feature_names - current_feature_names
    total_snap_features = max(len(snap_features), 1)
    feature_drift = min((len(added) + len(removed)) / total_snap_features * 100, 100)

    # 2. Effort Drift — change in total effort days vs snapshot
    snap_effort = sum(f.get("effort_days", 0) for f in snap_features)
    current_effort = sum(f.effort_days for f in current_features)
    if snap_effort > 0:
        effort_drift = min(abs(current_effort - snap_effort) / snap_effort * 100, 100)
    else:
        effort_drift = 0.0

    # 3. Timeline Drift — based on approved CRs that mention timeline change
    timeline_crs = db.query(models.ChangeRequest).filter(
        models.ChangeRequest.project_id == project_id,
        models.ChangeRequest.cr_type == models.CRType.timeline_change,
        models.ChangeRequest.status == models.CRStatus.approved,
    ).count()
    # Each approved timeline CR contributes ~10% drift (capped at 100)
    timeline_drift = min(timeline_crs * 10.0, 100.0)

    # Weighted overall
    overall = (feature_drift * 0.40) + (effort_drift * 0.35) + (timeline_drift * 0.25)

    # CR stats
    all_crs = db.query(models.ChangeRequest).filter(
        models.ChangeRequest.project_id == project_id
    ).all()
    approved = sum(1 for cr in all_crs if cr.status == models.CRStatus.approved)
    rejected = sum(1 for cr in all_crs if cr.status == models.CRStatus.rejected)
    pending = sum(1 for cr in all_crs if cr.status in (
        models.CRStatus.submitted, models.CRStatus.analyzing, models.CRStatus.under_review
    ))

    return {
        "feature_drift": round(feature_drift, 1),
        "effort_drift": round(effort_drift, 1),
        "timeline_drift": round(timeline_drift, 1),
        "overall_drift": round(overall, 1),
        "drift_level": _categorize(overall),
        "total_crs": len(all_crs),
        "approved_crs": approved,
        "pending_crs": pending,
        "rejected_crs": rejected,
    }


def _categorize(overall: float) -> str:
    if overall < 15:
        return "Low"
    elif overall < 35:
        return "Moderate"
    elif overall < 60:
        return "High"
    else:
        return "Critical"


def _empty_drift(project_id: int, db: Session) -> dict:
    all_crs = db.query(models.ChangeRequest).filter(
        models.ChangeRequest.project_id == project_id
    ).all()
    return {
        "feature_drift": 0.0,
        "effort_drift": 0.0,
        "timeline_drift": 0.0,
        "overall_drift": 0.0,
        "drift_level": "Low",
        "total_crs": len(all_crs),
        "approved_crs": 0,
        "pending_crs": 0,
        "rejected_crs": 0,
    }
