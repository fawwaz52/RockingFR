from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
import os
import shutil
from sqlalchemy.orm import Session
from typing import List
from . import crud, models, schemas
from .database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="StableOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Seed paddocks on startup
@app.on_event("startup")
def on_startup():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        crud.seed_paddocks(db)
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Horse Routes
# ---------------------------------------------------------------------------

@app.post("/api/upload/")
def upload_image(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    return {"url": f"http://localhost:8000/{file_location}"}

@app.get("/api/horses/", response_model=List[schemas.Horse])
def read_horses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_horses(db, skip=skip, limit=limit)

@app.post("/api/horses/", response_model=schemas.Horse)
def create_horse(horse: schemas.HorseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Horse).filter(models.Horse.microchip_id == horse.microchip_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Microchip already registered")
    return crud.create_horse(db=db, horse=horse)

# ---------------------------------------------------------------------------
# Paddock Routes
# ---------------------------------------------------------------------------

@app.get("/api/paddocks/", response_model=List[schemas.Paddock])
def read_paddocks(db: Session = Depends(get_db)):
    return crud.get_paddocks(db)

@app.get("/api/paddocks/{paddock_id}")
def read_paddock(paddock_id: int, db: Session = Depends(get_db)):
    paddock = crud.get_paddock(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    detail = crud.compute_paddock_detail(paddock)
    # Build full response dict
    result = schemas.Paddock.model_validate(paddock).model_dump()
    result.update(detail)
    return result

@app.post("/api/paddocks/{paddock_id}/release")
def release_horses(paddock_id: int, db: Session = Depends(get_db)):
    paddock = crud.release_horses(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    detail = crud.compute_paddock_detail(paddock)
    result = schemas.Paddock.model_validate(paddock).model_dump()
    result.update(detail)
    return result

@app.post("/api/paddocks/{paddock_id}/lock")
def lock_gates(paddock_id: int, db: Session = Depends(get_db)):
    paddock = crud.lock_gates(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    detail = crud.compute_paddock_detail(paddock)
    result = schemas.Paddock.model_validate(paddock).model_dump()
    result.update(detail)
    return result

@app.post("/api/paddocks/{paddock_id}/incident", response_model=schemas.Incident)
def report_incident(paddock_id: int, incident: schemas.IncidentCreate, db: Session = Depends(get_db)):
    paddock = crud.get_paddock(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    return crud.report_incident(db, paddock_id, incident)

@app.post("/api/paddocks/{paddock_id}/season")
def toggle_season(paddock_id: int, fast_growth: bool = False, db: Session = Depends(get_db)):
    paddock = crud.toggle_season(db, paddock_id, fast_growth)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    detail = crud.compute_paddock_detail(paddock)
    result = schemas.Paddock.model_validate(paddock).model_dump()
    result.update(detail)
    return result
