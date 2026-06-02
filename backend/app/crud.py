from sqlalchemy.orm import Session
from . import models, schemas
import time
from datetime import datetime, timedelta

GRAZING_WINDOW_HOURS = 2
STANDARD_REST_DAYS = 25
MAX_SAFE_SEASON_HOURS = 200.0  # hours before paddock needs major rest

# ---------------------------------------------------------------------------
# Horse CRUD
# ---------------------------------------------------------------------------

def get_horses(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Horse).offset(skip).limit(limit).all()

def create_horse(db: Session, horse: schemas.HorseCreate):
    db_horse = models.Horse(
        id=f"h{int(time.time() * 1000)}",
        registered_name=horse.registered_name,
        stable_name=horse.stable_name,
        microchip_id=horse.microchip_id,
        status=horse.status,
        image_url=horse.image_url,
        predictive_analysis_text=horse.predictive_analysis_text
    )
    db.add(db_horse)
    db.commit()
    db.refresh(db_horse)

    current = models.HorseStat(
        horse_id=db_horse.id,
        **horse.current_stats.model_dump()
    )
    predicted = models.HorseStat(
        horse_id=db_horse.id,
        **horse.predicted_stats.model_dump()
    )
    db.add(current)
    db.add(predicted)
    db.commit()

    return db_horse

# ---------------------------------------------------------------------------
# Paddock initialisation helpers
# ---------------------------------------------------------------------------

def seed_paddocks(db: Session):
    """Create 6 default paddocks if none exist."""
    count = db.query(models.Paddock).count()
    if count == 0:
        for i in range(1, 7):
            p = models.Paddock(name=f"Paddock {i}")
            db.add(p)
        db.commit()

def get_paddocks(db: Session):
    return db.query(models.Paddock).order_by(models.Paddock.id).all()

def get_paddock(db: Session, paddock_id: int):
    return db.query(models.Paddock).filter(models.Paddock.id == paddock_id).first()

# ---------------------------------------------------------------------------
# Grazing Actions
# ---------------------------------------------------------------------------

def release_horses(db: Session, paddock_id: int):
    """Start a 2-hour grazing session."""
    paddock = get_paddock(db, paddock_id)
    if not paddock:
        return None
    if paddock.current_state == models.PaddockState.grazing:
        return paddock  # already grazing, do nothing

    now = datetime.utcnow()
    session = models.GrazingSession(
        paddock_id=paddock_id,
        start_time=now,
        projected_end_time=now + timedelta(hours=GRAZING_WINDOW_HOURS),
        status="active"
    )
    db.add(session)

    paddock.current_state = models.PaddockState.grazing
    db.commit()
    db.refresh(paddock)
    return paddock

def lock_gates(db: Session, paddock_id: int):
    """End the active grazing session and return horses."""
    paddock = get_paddock(db, paddock_id)
    if not paddock:
        return None
    if paddock.current_state == models.PaddockState.ready:
        return paddock  # already locked

    now = datetime.utcnow()
    active_session = (
        db.query(models.GrazingSession)
        .filter(
            models.GrazingSession.paddock_id == paddock_id,
            models.GrazingSession.status == "active"
        )
        .order_by(models.GrazingSession.start_time.desc())
        .first()
    )

    if active_session:
        active_session.actual_end_time = now
        active_session.status = "completed"
        # Accumulate wear hours
        hours_grazed = (now - active_session.start_time).total_seconds() / 3600
        paddock.total_season_hours += hours_grazed
        paddock.last_grazed_end_time = now

    paddock.current_state = models.PaddockState.ready
    db.commit()
    db.refresh(paddock)
    return paddock

# ---------------------------------------------------------------------------
# Incident Reporting
# ---------------------------------------------------------------------------

def report_incident(db: Session, paddock_id: int, incident: schemas.IncidentCreate):
    incident_obj = models.Incident(
        paddock_id=paddock_id,
        issue_type=incident.issue_type,
        reported_at=datetime.utcnow(),
        resolved=0
    )
    db.add(incident_obj)
    db.commit()
    db.refresh(incident_obj)
    return incident_obj

# ---------------------------------------------------------------------------
# Season Toggle
# ---------------------------------------------------------------------------

def toggle_season(db: Session, paddock_id: int, fast_growth: bool):
    """Switch between normal (1.0×) and monsoon fast-growth (0.8×) rest factor."""
    paddock = get_paddock(db, paddock_id)
    if not paddock:
        return None
    paddock.season_multiplier = 0.8 if fast_growth else 1.0
    db.commit()
    db.refresh(paddock)
    return paddock

# ---------------------------------------------------------------------------
# Computed helpers (used by API response enrichment)
# ---------------------------------------------------------------------------

def compute_paddock_detail(paddock: models.Paddock):
    """Return extra computed fields for the detail view."""
    wear_pct = min(100, (paddock.total_season_hours / MAX_SAFE_SEASON_HOURS) * 100)
    
    effective_rest_days = STANDARD_REST_DAYS * paddock.season_multiplier
    days_since_last_graze = None
    days_until_ready = None
    if paddock.last_grazed_end_time:
        delta = datetime.utcnow() - paddock.last_grazed_end_time
        days_since_last_graze = delta.total_seconds() / 86400
        days_until_ready = max(0, effective_rest_days - days_since_last_graze)

    # Active session countdown
    active_session = None
    minutes_remaining = None
    for s in paddock.sessions:
        if s.status == "active":
            active_session = s
            elapsed = (datetime.utcnow() - s.start_time).total_seconds() / 60
            minutes_remaining = max(0, GRAZING_WINDOW_HOURS * 60 - elapsed)
            break

    return {
        "wear_pct": round(wear_pct, 1),
        "effective_rest_days": round(effective_rest_days, 1),
        "days_since_last_graze": round(days_since_last_graze, 1) if days_since_last_graze is not None else None,
        "days_until_ready": round(days_until_ready, 1) if days_until_ready is not None else None,
        "minutes_remaining": round(minutes_remaining, 1) if minutes_remaining is not None else None,
    }
