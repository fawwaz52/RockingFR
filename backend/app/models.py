from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Boolean, Text
from sqlalchemy.orm import relationship
import enum
from .database import Base

class HorseStatus(str, enum.Enum):
    at_track = "at_track"
    letting_down = "letting_down"
    in_training = "in_training"
    for_sale = "for_sale"
    sold = "sold"

class Horse(Base):
    __tablename__ = "horses"

    id = Column(String, primary_key=True, index=True)
    registered_name = Column(String, index=True)
    stable_name = Column(String, nullable=True)
    microchip_id = Column(String, unique=True, index=True)
    status = Column(Enum(HorseStatus), default=HorseStatus.letting_down)
    image_url = Column(String, nullable=True)
    predictive_analysis_text = Column(String, nullable=True)

    stats = relationship("HorseStat", back_populates="horse")

class HorseStat(Base):
    __tablename__ = "horse_stats"

    id = Column(Integer, primary_key=True, index=True)
    horse_id = Column(String, ForeignKey("horses.id"))
    stat_type = Column(String)  # "current" or "predicted"
    sanity = Column(Integer)
    balance = Column(Integer)
    responsiveness = Column(Integer)
    stamina = Column(Integer)

    horse = relationship("Horse", back_populates="stats")

class PaddockState(str, enum.Enum):
    ready = "ready"
    grazing = "grazing"

class Paddock(Base):
    __tablename__ = "paddocks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    current_state = Column(Enum(PaddockState), default=PaddockState.ready)
    total_season_hours = Column(Float, default=0.0)
    last_grazed_end_time = Column(DateTime, nullable=True)
    season_multiplier = Column(Float, default=1.0)

    # AI scan gate: must pass scan before releasing horses
    last_scan_passed = Column(Boolean, nullable=True)   # None = never scanned
    last_scan_id = Column(Integer, ForeignKey("grass_analyses.id"), nullable=True)

    sessions = relationship("GrazingSession", back_populates="paddock",
                            foreign_keys="GrazingSession.paddock_id")
    incidents = relationship("Incident", back_populates="paddock")
    grass_analyses = relationship("GrassAnalysis", back_populates="paddock",
                                  foreign_keys="GrassAnalysis.paddock_id")

class GrazingSession(Base):
    __tablename__ = "grazing_sessions"

    id = Column(Integer, primary_key=True, index=True)
    paddock_id = Column(Integer, ForeignKey("paddocks.id"))
    start_time = Column(DateTime)
    projected_end_time = Column(DateTime)
    actual_end_time = Column(DateTime, nullable=True)
    status = Column(String)  # "active" or "completed"

    paddock = relationship("Paddock", back_populates="sessions",
                           foreign_keys=[paddock_id])

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    paddock_id = Column(Integer, ForeignKey("paddocks.id"))
    issue_type = Column(String)
    reported_at = Column(DateTime)
    resolved = Column(Integer, default=0)

    paddock = relationship("Paddock", back_populates="incidents")

class GrassAnalysis(Base):
    __tablename__ = "grass_analyses"

    id = Column(Integer, primary_key=True, index=True)
    paddock_id = Column(Integer, ForeignKey("paddocks.id"))
    analyzed_at = Column(DateTime)
    image_url = Column(String, nullable=True)

    # AI structured output fields
    grass_coverage_pct = Column(Float)
    soil_exposure_detected = Column(Boolean)
    dominant_color = Column(String)
    weed_infestation_risk = Column(String)  # "low" | "medium" | "high"
    allow_grazing = Column(Boolean)
    groom_instruction = Column(Text)
    raw_ai_response = Column(Text, nullable=True)

    paddock = relationship("Paddock", back_populates="grass_analyses",
                           foreign_keys=[paddock_id])
