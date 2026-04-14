from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.core.config import settings

from app.routers import auth, subjects, notes, qa, videos, pyq, syllabus
from app.routers import chat, search, import_, admin, announcements, bookmarks, upload, class_chat, ai_chat

# Import all models to ensure metadata takes note of them
import app.models.user
import app.models.academic
import app.models.content
import app.models.import_
import app.models.class_chat

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Smart LMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file routing for local uploads
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include all Routers
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(notes.router)
app.include_router(qa.router)
app.include_router(videos.router)
app.include_router(pyq.router)
app.include_router(syllabus.router)
app.include_router(chat.router)
app.include_router(search.router)
app.include_router(import_.router)
app.include_router(admin.router)
app.include_router(announcements.router)
app.include_router(bookmarks.router)
app.include_router(upload.router)
app.include_router(class_chat.router)
app.include_router(ai_chat.router)

@app.get("/")
def read_root():
    return {"message": "AI Smart LMS API Running"}
