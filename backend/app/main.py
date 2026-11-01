from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.core.config import settings

from app.routers import auth, subjects, notes, qa, videos, pyq, syllabus
from app.routers import chat, search, import_, admin, announcements, bookmarks, upload, class_chat, ai_chat
from app.routers import results, gamification, chat_history, jobs

# Import all models to ensure metadata takes note of them
import app.models.user
import app.models.academic
import app.models.content
import app.models.import_
import app.models.class_chat
import app.models.results
import app.models.gamification
import app.models.chat_session
import app.models.jobs

# Create DB Tables & run safe column additions
from app.migrations import run_migrations
run_migrations()

app = FastAPI(title="AI Smart LMS API")

@app.on_event("startup")
def check_and_seed_db():
    from app.database import SessionLocal
    from app.models.academic import Subject
    db = SessionLocal()
    try:
        # If no subjects exist, the database is fresh/wiped. We should automatically seed it!
        if db.query(Subject).count() == 0:
            print("Detected empty database! Running automatic seeder...")
            try:
                import seed_admin
                import seed_subjects
                import seed_exact_content
                seed_admin.seed_admin()
                seed_subjects.seed()
                seed_exact_content.run_seeder()
                print("Automatic seeding completed successfully.")
            except Exception as e:
                print(f"Failed to auto-seed: {e}")

        # Ensure sample jobs if jobs table is empty
        try:
            from app.models.jobs import Job
            if db.query(Job).count() == 0:
                print("No jobs found in database, seeding sample demo listings...")
                import seed_jobs_demo
                seed_jobs_demo.seed_demo_jobs()
        except Exception as e:
            print(f"Failed to seed demo jobs on startup: {e}")
    finally:
        db.close()
    
    # Initialize Job Query background periodic sync engine
    try:
        from app.services.jobs.sync_service import start_background_scheduler
        start_background_scheduler()
    except Exception as e:
        print(f"Could not start jobs background scheduler: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(results.router)
app.include_router(gamification.router)
app.include_router(chat_history.router)
app.include_router(jobs.router)

@app.get("/seed")
def trigger_seeding():
    try:
        import seed_admin
        import seed_subjects
        import seed_exact_content
        seed_admin.seed_admin()
        seed_subjects.seed()
        seed_exact_content.run_seeder()
        return {"msg": "Database successfully seeded built-in subjects and data!"}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}

@app.get("/")
def read_root():
    return {"message": "AI Smart LMS API Running"}
