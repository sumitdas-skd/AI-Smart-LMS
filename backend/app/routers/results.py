from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User
from app.services.results_service import ResultsService
from app.schemas.results import StudentResultsResponse

router = APIRouter(prefix="/results", tags=["results"])

@router.get("/me", response_model=StudentResultsResponse)
def get_my_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve full transcript, semester-wise SGPA, and cumulative CGPA for the current logged-in student."""
    return ResultsService.get_student_results(db, current_user.id)

@router.get("/student/{user_id}", response_model=StudentResultsResponse)
def get_student_results_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
) -> Any:
    """Teacher/Admin only: Inspect full academic performance for a specific student."""
    return ResultsService.get_student_results(db, user_id)

@router.post("/upload")
async def upload_results(
    file: UploadFile = File(...),
    dry_run: bool = Query(False, description="Set to true to preview validation errors without committing changes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
) -> Any:
    """Teacher/Admin only: Bulk upload student results via CSV or XLSX with dry-run verification."""
    return await ResultsService.process_results_upload(db, file, current_user, dry_run=dry_run)

@router.get("/upload-template", response_class=PlainTextResponse)
def download_results_template():
    """Download a pre-formatted CSV template for bulk student marks upload."""
    csv_content = (
        "roll_number,email,subject_code,semester,midsem_marks,endsem_marks,assignment_marks\n"
        "220101,student1@abit.edu.in,CS101,1,24.5,42.0,18.0\n"
        "220102,student2@abit.edu.in,CS101,1,28.0,46.5,19.0\n"
    )
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=results_upload_template.csv"}
    )

