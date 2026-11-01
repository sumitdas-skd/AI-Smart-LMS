import firebase_admin
from firebase_admin import credentials, storage
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)

firebase_app = None

def initialize_firebase():
    global firebase_app
    if firebase_app:
        return firebase_app
        
    if not settings.FIREBASE_CREDENTIALS_JSON or not settings.FIREBASE_STORAGE_BUCKET:
        logger.warning("Firebase credentials or bucket not configured. Falling back to local storage placeholders.")
        return None

    try:
        cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
        cred = credentials.Certificate(cred_dict)
        firebase_app = firebase_admin.initialize_app(cred, {
            'storageBucket': settings.FIREBASE_STORAGE_BUCKET
        })
        logger.info("Firebase Admin SDK initialized successfully.")
        return firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return None

def get_bucket():
    if not firebase_app:
        initialize_firebase()
    
    if firebase_app:
        return storage.bucket()
    return None
