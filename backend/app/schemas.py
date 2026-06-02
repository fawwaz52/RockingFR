from pydantic import BaseModel
from typing import Optional, List
from .models import HorseStatus

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
    class Config:
        from_attributes = True

from datetime import datetime
from .models import PaddockState

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
    sessions: List[GrazingSession] = []
    incidents: List[Incident] = []
    class Config:
        from_attributes = True
