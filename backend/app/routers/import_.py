import threading
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db, SessionLocal
from app.models.import_ import ImportJob, ExternalResource
from app.schemas.import_ import ImportJobResponse, ExternalResourceResponse
from app.scraper.import_service import ImportService
from app.core.deps import require_role
from app.models.user import User

router = APIRouter(prefix="/import", tags=["import"])

def background_import_task(user_id: int, urls: List[str], job_id: int):
    # Setup its own db session for bg task
    db = SessionLocal()
    try:
        success = ImportService.trigger_import(db, user_id, urls, job_id)
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if job:
            from sqlalchemy.sql import func
            job.status = "completed"
            job.resource_count = success
            job.completed_at = func.now()
            db.commit()
    except Exception as e:
        print(f"Background Import failed: {e}")
        db.rollback()
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if job:
            job.status = "failed"
            db.commit()
    finally:
        db.close()

@router.post("/trigger", response_model=ImportJobResponse)
def trigger_import(
    urls: List[str], 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["admin"]))
):
    job = ImportJob(triggered_by=current_user.id, status="running")
    db.add(job)
    db.commit()
    db.refresh(job)
    
    background_tasks.add_task(background_import_task, current_user.id, urls, job.id)
    return job

@router.get("/jobs", response_model=List[ImportJobResponse])
def get_import_jobs(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    return db.query(ImportJob).order_by(ImportJob.started_at.desc()).all()

@router.get("/resources", response_model=List[ExternalResourceResponse])
def get_external_resources(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "teacher"]))):
    return db.query(ExternalResource).order_by(ExternalResource.fetched_at.desc()).all()
    
@router.put("/resources/{res_id}/approve")
def approve_resource(res_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    res = db.query(ExternalResource).filter(ExternalResource.id == res_id).first()
    if not res: raise HTTPException(status_code=404)
    res.status = "approved"
    db.commit()
    return {"msg": "Approved"}
