from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import HorseStatus, PaddockState

# ---------------------------------------------------------------------------
# Horse Schemas
# ---------------------------------------------------------------------------

class HorseStatBase(BaseModel):
    stat_type: str
    sanity: int
    balance: int
    responsiveness: int
    stamina: int

class HorseStatCreate(HorseStatBase):
    pass

class HorseStat(HorseStatBase):
    id: int
    horse_id: str
    class Config:
        from_attributes = True

class TrainingLogBase(BaseModel):
    notes: Optional[str] = None
    sanity: Optional[int] = None
    balance: Optional[int] = None
    responsiveness: Optional[int] = None
    stamina: Optional[int] = None

class TrainingLogCreate(TrainingLogBase):
    pass

class TrainingLog(TrainingLogBase):
    id: int
    horse_id: str
    reported_at: datetime
    class Config:
        from_attributes = True

class HorseBase(BaseModel):
    registered_name: str
    stable_name: Optional[str] = None
    microchip_id: str
    status: HorseStatus
    image_url: Optional[str] = None
    predictive_analysis_text: Optional[str] = None

class HorseCreate(HorseBase):
    current_stats: HorseStatCreate
    predicted_stats: HorseStatCreate

class Horse(HorseBase):
    id: str
    stats: List[HorseStat] = []
    training_logs: List[TrainingLog] = []
    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Grass Analysis Schemas
# ---------------------------------------------------------------------------

class GrassAnalysisResult(BaseModel):
    id: int
    paddock_id: int
    analyzed_at: datetime
    image_url: Optional[str] = None
    grass_coverage_pct: float
    soil_exposure_detected: bool
    dominant_color: str
    weed_infestation_risk: str
    allow_grazing: bool
    groom_instruction: str
    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Paddock Schemas
# ---------------------------------------------------------------------------

class IncidentBase(BaseModel):
    issue_type: str

class IncidentCreate(IncidentBase):
    pass

class Incident(IncidentBase):
    id: int
    paddock_id: int
    reported_at: datetime
    resolved: int
    class Config:
        from_attributes = True

class GrazingSessionBase(BaseModel):
    start_time: datetime
    projected_end_time: datetime
    status: str

class GrazingSession(GrazingSessionBase):
    id: int
    paddock_id: int
    actual_end_time: Optional[datetime] = None
    class Config:
        from_attributes = True

class PaddockBase(BaseModel):
    name: str
    current_state: PaddockState
    total_season_hours: float
    season_multiplier: float

class Paddock(PaddockBase):
    id: int
    last_grazed_end_time: Optional[datetime] = None
    last_scan_passed: Optional[bool] = None
    sessions: List[GrazingSession] = []
    incidents: List[Incident] = []
    grass_analyses: List[GrassAnalysisResult] = []
    class Config:
        from_attributes = True
