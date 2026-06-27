from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
import os, shutil
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

@app.on_event("startup")
def on_startup():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        crud.seed_paddocks(db)
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Image upload
# ---------------------------------------------------------------------------
@app.post("/api/upload/")
def upload_image(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as f:
        shutil.copyfileobj(file.file, f)
    return {"url": f"http://localhost:8000/{file_location}"}

# ---------------------------------------------------------------------------
# Horse routes
# ---------------------------------------------------------------------------
@app.get("/api/horses/", response_model=List[schemas.Horse])
def read_horses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_horses(db, skip=skip, limit=limit)

@app.post("/api/horses/", response_model=schemas.Horse)
def create_horse(horse: schemas.HorseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Horse).filter(models.Horse.microchip_id == horse.microchip_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Microchip already registered")
    return crud.create_horse(db=db, horse=horse)

@app.post("/api/horses/{horse_id}/training_logs", response_model=schemas.TrainingLog)
def create_training_log(horse_id: str, log: schemas.TrainingLogCreate, db: Session = Depends(get_db)):
    horse = db.query(models.Horse).filter(models.Horse.id == horse_id).first()
    if not horse:
        raise HTTPException(status_code=404, detail="Horse not found")
    return crud.create_training_log(db=db, horse_id=horse_id, log=log)

# ---------------------------------------------------------------------------
# Paddock routes
# ---------------------------------------------------------------------------
def _paddock_response(paddock, db):
    detail = crud.compute_paddock_detail(paddock)
    result = schemas.Paddock.model_validate(paddock).model_dump()
    result.update(detail)
    return result

@app.get("/api/paddocks/", response_model=List[schemas.Paddock])
def read_paddocks(db: Session = Depends(get_db)):
    return crud.get_paddocks(db)

@app.get("/api/paddocks/{paddock_id}")
def read_paddock(paddock_id: int, db: Session = Depends(get_db)):
    paddock = crud.get_paddock(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    return _paddock_response(paddock, db)

@app.post("/api/paddocks/{paddock_id}/release")
def release_horses(paddock_id: int, db: Session = Depends(get_db)):
    # Enforce scan gate — must have a passing scan before releasing
    paddock = crud.get_paddock(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    if paddock.last_scan_passed is not True:
        raise HTTPException(
            status_code=403,
            detail="Scan required: Please scan the grass first. The AI must approve before releasing horses."
        )
    paddock = crud.release_horses(db, paddock_id)
    return _paddock_response(paddock, db)

@app.post("/api/paddocks/{paddock_id}/lock")
def lock_gates(paddock_id: int, db: Session = Depends(get_db)):
    paddock = crud.lock_gates(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")
    return _paddock_response(paddock, db)

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
    return _paddock_response(paddock, db)

# ---------------------------------------------------------------------------
# AI Grass Analysis route
# ---------------------------------------------------------------------------
@app.post("/api/paddocks/{paddock_id}/analyze", response_model=schemas.GrassAnalysisResult)
async def analyze_grass(paddock_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    paddock = crud.get_paddock(db, paddock_id)
    if not paddock:
        raise HTTPException(status_code=404, detail="Paddock not found")

    # Save image
    safe_name = f"grass_{paddock_id}_{int(__import__('time').time())}{os.path.splitext(file.filename)[1]}"
    file_path = f"uploads/{safe_name}"
    image_bytes = await file.read()
    with open(file_path, "wb") as f:
        f.write(image_bytes)
    image_url = f"http://localhost:8000/{file_path}"

    try:
        analysis = crud.analyze_grass_image(
            image_bytes=image_bytes,
            mime_type=file.content_type or "image/jpeg",
            paddock_id=paddock_id,
            db=db,
            image_url=image_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    return analysis
