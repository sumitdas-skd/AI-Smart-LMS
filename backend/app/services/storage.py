import os
import shutil
from fastapi import UploadFile
import uuid
import logging

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _get_bucket():
    """Try to get Firebase bucket; return None safely if not configured."""
    try:
        from app.services.firebase import get_bucket
        return get_bucket()
    except Exception as e:
        logger.debug(f"Firebase not available: {e}")
        return None


class StorageService:
    @staticmethod
    async def save_file(file: UploadFile, subfolder: str = "") -> str:
        bucket = _get_bucket()

        if bucket:
            try:
                original_name = file.filename or "upload"
                blob_name = f"{subfolder}/{uuid.uuid4()}_{original_name}".replace("//", "/")
                blob = bucket.blob(blob_name)
                file.file.seek(0)
                blob.upload_from_file(file.file, content_type=file.content_type)
                blob.make_public()
                return blob.public_url
            except Exception as e:
                logger.warning(f"Firebase upload failed, falling back to local storage: {e}")

        # --- Robust local storage fallback ---
        target_dir = os.path.join(UPLOAD_DIR, subfolder) if subfolder else UPLOAD_DIR
        os.makedirs(target_dir, exist_ok=True)

        original_name = file.filename or "upload"
        # UUID prefix prevents filename collisions
        unique_name = f"{uuid.uuid4().hex}_{original_name}"
        file_location = os.path.join(target_dir, unique_name)

        file.file.seek(0)
        with open(file_location, "wb+") as f:
            shutil.copyfileobj(file.file, f)

        if subfolder:
            return f"/uploads/{subfolder}/{unique_name}"
        return f"/uploads/{unique_name}"

    @staticmethod
    def delete_file(file_path: str) -> bool:
        bucket = _get_bucket()

        if bucket and "storage.googleapis.com" in (file_path or ""):
            try:
                from app.core.config import settings
                blob_name = file_path.split(f"{settings.FIREBASE_STORAGE_BUCKET}/")[-1]
                blob = bucket.blob(blob_name)
                blob.delete()
                return True
            except Exception:
                return False

        # Delete from local storage
        if not file_path:
            return False
        rel_path = file_path.lstrip("/")
        if rel_path.startswith("uploads/"):
            rel_path = rel_path[len("uploads/"):]

        full_path = os.path.join(UPLOAD_DIR, rel_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False
