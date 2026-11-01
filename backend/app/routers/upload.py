from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.services.storage import StorageService
from app.core.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/ogg", "video/avi",
    "video/quicktime", "video/x-msvideo", "video/x-ms-wmv",
    "video/x-matroska", "video/3gpp"
}

MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    path = await StorageService.save_file(file, subfolder="materials")
    return {"file_path": path, "filename": file.filename}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    path = await StorageService.save_file(file, subfolder="avatars")
    return {"file_path": path}


@router.post("/chat")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    path = await StorageService.save_file(file, subfolder="chat")
    return {"file_path": path, "filename": file.filename}


@router.post("/video-file")
async def upload_video_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    """Upload a video file (mp4, webm, etc.) directly to local storage."""
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{file.content_type}'. Allowed: mp4, webm, avi, mov, mkv."
        )

    # Check file size (read up to MAX_VIDEO_SIZE + 1 byte to detect oversized files)
    content = await file.read()
    if len(content) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="Video file too large. Maximum size is 500 MB.")

    # Reset pointer after reading
    import io
    file.file = io.BytesIO(content)

    path = await StorageService.save_file(file, subfolder="videos")
    return {"file_path": path, "filename": file.filename}
