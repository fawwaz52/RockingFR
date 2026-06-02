import os
import json
import base64
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from . import models, schemas
import time

GRAZING_WINDOW_HOURS = 2
STANDARD_REST_DAYS = 25
MAX_SAFE_SEASON_HOURS = 200.0

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

    current = models.HorseStat(horse_id=db_horse.id, **horse.current_stats.model_dump())
    predicted = models.HorseStat(horse_id=db_horse.id, **horse.predicted_stats.model_dump())
    db.add(current)
    db.add(predicted)
    db.commit()
    return db_horse

# ---------------------------------------------------------------------------
# Paddock seed & getters
# ---------------------------------------------------------------------------

def seed_paddocks(db: Session):
    if db.query(models.Paddock).count() == 0:
        for i in range(1, 7):
            db.add(models.Paddock(name=f"Paddock {i}"))
        db.commit()

def get_paddocks(db: Session):
    return db.query(models.Paddock).order_by(models.Paddock.id).all()

def get_paddock(db: Session, paddock_id: int):
    return db.query(models.Paddock).filter(models.Paddock.id == paddock_id).first()

# ---------------------------------------------------------------------------
# AI Grass Analysis
# ---------------------------------------------------------------------------

GRASS_SYSTEM_PROMPT = """You are the Agricultural Intelligence Agent for a professional horse ranch in West Java, Indonesia.
Your job is to analyze a single photo of a rotational grazing cell and determine if it is safe and suitable
for 2 hours of trampling and grazing by 4 horses today.

Evaluate:
- Turf density and grass coverage percentage
- Presence of bare soil or exposed roots
- Signs of over-grazing or excessive wear
- Weed or pest infestation risk
- Ground moisture / mud that could injure hooves

You MUST reply ONLY with a valid JSON object. No markdown, no explanation outside the JSON.
Use this exact structure:
{
  "grass_coverage_pct": <0-100 float>,
  "soil_exposure_detected": <true|false>,
  "dominant_color": "<vibrant_green|pale_green|yellow|brown|muddy>",
  "weed_infestation_risk": "<low|medium|high>",
  "allow_grazing": <true|false>,
  "groom_instruction": "<friendly 1-2 sentence instruction for the groom>"
}

Decision rule:
- allow_grazing = true  if grass_coverage_pct >= 65 AND soil_exposure_detected = false AND weed_infestation_risk != "high"
- allow_grazing = false otherwise; instruct groom to move to the next paddock."""

def analyze_grass_image(image_bytes: bytes, mime_type: str, paddock_id: int, db: Session, image_url: str = None):
    """Call Gemini Vision to analyze the grass image and save result to DB."""
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        # Fallback mock for development when no key is set
        result_data = _mock_analysis(paddock_id)
    else:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        image_part = {"mime_type": mime_type, "data": image_bytes}
        response = model.generate_content([GRASS_SYSTEM_PROMPT, image_part])

        raw_text = response.text.strip()
        # Strip potential markdown code fences
        clean = re.sub(r"```json|```", "", raw_text).strip()
        result_data = json.loads(clean)

    # Persist to DB
    analysis = models.GrassAnalysis(
        paddock_id=paddock_id,
        analyzed_at=datetime.utcnow(),
        image_url=image_url,
        grass_coverage_pct=result_data["grass_coverage_pct"],
        soil_exposure_detected=result_data["soil_exposure_detected"],
        dominant_color=result_data["dominant_color"],
        weed_infestation_risk=result_data["weed_infestation_risk"],
        allow_grazing=result_data["allow_grazing"],
        groom_instruction=result_data["groom_instruction"],
        raw_ai_response=json.dumps(result_data),
    )
    db.add(analysis)
    db.flush()  # get ID before commit

    # Update paddock scan state
    paddock = get_paddock(db, paddock_id)
    if paddock:
        paddock.last_scan_passed = result_data["allow_grazing"]
        paddock.last_scan_id = analysis.id
        # If scan fails, reset any erroneously open grazing state
        if not result_data["allow_grazing"] and paddock.current_state == models.PaddockState.grazing:
            paddock.current_state = models.PaddockState.ready

    db.commit()
    db.refresh(analysis)
    return analysis

def _mock_analysis(paddock_id: int) -> dict:
    """Returns a realistic mock when no GEMINI_API_KEY is configured."""
    return {
        "grass_coverage_pct": 88.0,
        "soil_exposure_detected": False,
        "dominant_color": "vibrant_green",
        "weed_infestation_risk": "low",
        "allow_grazing": True,
        "groom_instruction": (
            "[DEMO MODE — No API key set] Turf condition looks excellent. "
            "You may release the horses for the 2-hour grazing window."
        ),
    }

# ---------------------------------------------------------------------------
# Grazing session actions
# ---------------------------------------------------------------------------

def release_horses(db: Session, paddock_id: int):
    paddock = get_paddock(db, paddock_id)
    if not paddock or paddock.current_state == models.PaddockState.grazing:
        return paddock

    now = datetime.utcnow()
    session = models.GrazingSession(
        paddock_id=paddock_id,
        start_time=now,
        projected_end_time=now + timedelta(hours=GRAZING_WINDOW_HOURS),
        status="active"
    )
    db.add(session)
    paddock.current_state = models.PaddockState.grazing
    # Reset scan gate after release so next time groom must re-scan
    paddock.last_scan_passed = None
    db.commit()
    db.refresh(paddock)
    return paddock

def lock_gates(db: Session, paddock_id: int):
    paddock = get_paddock(db, paddock_id)
    if not paddock or paddock.current_state == models.PaddockState.ready:
        return paddock

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
        hours = (now - active_session.start_time).total_seconds() / 3600
        paddock.total_season_hours += hours
        paddock.last_grazed_end_time = now

    paddock.current_state = models.PaddockState.ready
    db.commit()
    db.refresh(paddock)
    return paddock

# ---------------------------------------------------------------------------
# Incident reporting
# ---------------------------------------------------------------------------

def report_incident(db: Session, paddock_id: int, incident: schemas.IncidentCreate):
    obj = models.Incident(
        paddock_id=paddock_id,
        issue_type=incident.issue_type,
        reported_at=datetime.utcnow(),
        resolved=0
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# ---------------------------------------------------------------------------
# Season toggle
# ---------------------------------------------------------------------------

def toggle_season(db: Session, paddock_id: int, fast_growth: bool):
    paddock = get_paddock(db, paddock_id)
    if not paddock:
        return None
    paddock.season_multiplier = 0.8 if fast_growth else 1.0
    db.commit()
    db.refresh(paddock)
    return paddock

# ---------------------------------------------------------------------------
# Computed detail helpers
# ---------------------------------------------------------------------------

def compute_paddock_detail(paddock: models.Paddock):
    wear_pct = min(100, (paddock.total_season_hours / MAX_SAFE_SEASON_HOURS) * 100)
    effective_rest = STANDARD_REST_DAYS * paddock.season_multiplier
    days_since = days_until = minutes_remaining = None

    if paddock.last_grazed_end_time:
        delta = datetime.utcnow() - paddock.last_grazed_end_time
        days_since = delta.total_seconds() / 86400
        days_until = max(0, effective_rest - days_since)

    for s in paddock.sessions:
        if s.status == "active":
            elapsed = (datetime.utcnow() - s.start_time).total_seconds() / 60
            minutes_remaining = max(0, GRAZING_WINDOW_HOURS * 60 - elapsed)
            break

    return {
        "wear_pct": round(wear_pct, 1),
        "effective_rest_days": round(effective_rest, 1),
        "days_since_last_graze": round(days_since, 1) if days_since is not None else None,
        "days_until_ready": round(days_until, 1) if days_until is not None else None,
        "minutes_remaining": round(minutes_remaining, 1) if minutes_remaining is not None else None,
    }
