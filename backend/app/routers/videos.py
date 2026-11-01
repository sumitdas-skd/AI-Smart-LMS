from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.content import Video
from app.schemas.content import VideoCreate, VideoResponse
from app.core.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/videos", tags=["videos"])

@router.get("/", response_model=List[VideoResponse])
def get_videos(subject_id: int = None, semester_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Video)
    if subject_id:
        q = q.filter(Video.subject_id == subject_id)
    if semester_id:
        q = q.filter(Video.semester_id == semester_id)
    return q.all()

@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@router.post("/", response_model=VideoResponse)
def create_video(
    item: VideoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    # Validate: must have at least one of youtube_url or video_file_path
    if not item.youtube_url and not item.video_file_path:
        raise HTTPException(
            status_code=400,
            detail="Either a YouTube URL or an uploaded video file path is required."
        )

    # Auto-extract thumbnail from YouTube URL if not provided
    if not item.thumbnail_url and item.youtube_url and "youtube.com/watch?v=" in item.youtube_url:
        vid_id = item.youtube_url.split("v=")[1].split("&")[0]
        item.thumbnail_url = f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg"

    new_vid = Video(**item.dict(), uploaded_by=current_user.id)
    db.add(new_vid)
    db.commit()
    db.refresh(new_vid)
    return new_vid

@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if current_user.role != "admin" and video.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Clean up stored file if it was a local upload
    if video.video_file_path:
        from app.services.storage import StorageService
        StorageService.delete_file(video.video_file_path)

    db.delete(video)
    db.commit()
    return {"msg": "Deleted successfully"}
