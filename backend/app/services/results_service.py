import csv
import io
import math
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, and_
from fastapi import HTTPException, UploadFile, status

from app.models.results import Result, SemesterResult
from app.models.user import User
from app.models.academic import Subject
from app.models.content import Note
from app.schemas.results import (
    StudentResultsResponse,
    SemesterResultSummary,
    SubjectResultItem,
    SGPATrendItem,
    UploadDryRunResponse,
    UploadCommitResponse,
    RowValidationError,
    UploadPreviewRow
)

# Configurable Max Marks per Component
MAX_MARKS_CONFIG = {
    "midsem": 30.0,
    "endsem": 50.0,
    "assignment": 20.0,
    "total": 100.0,
}

# Configurable Grading Scale (Standard 10-point scale: O, E, A, B, C, D, F)
# Pass mark threshold is 40.0
GRADING_SCALE = [
    {"min": 90.0, "max": 100.0, "grade": "O", "grade_point": 10.0},
    {"min": 80.0, "max": 89.99, "grade": "E", "grade_point": 9.0},
    {"min": 70.0, "max": 79.99, "grade": "A", "grade_point": 8.0},
    {"min": 60.0, "max": 69.99, "grade": "B", "grade_point": 7.0},
    {"min": 50.0, "max": 59.99, "grade": "C", "grade_point": 6.0},
    {"min": 40.0, "max": 49.99, "grade": "D", "grade_point": 5.0},
    {"min": 0.0,  "max": 39.99, "grade": "F", "grade_point": 0.0},
]

def calculate_grade(total_marks: float) -> Tuple[str, float]:
    """Calculates grade letter and grade point from total percentage/marks."""
    # Round to 2 decimal places to avoid float precision issues
    rounded = round(float(total_marks), 2)
    for band in GRADING_SCALE:
        if rounded >= band["min"]:
            return band["grade"], band["grade_point"]
    return "F", 0.0

class ResultsService:

    @staticmethod
    def get_student_results(db: Session, user_id: int) -> StudentResultsResponse:
        """Retrieves and calculates all semester results, SGPA, and cumulative CGPA."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")

        # Fetch all results with joined subjects in one query
        results = db.query(Result).options(
            selectinload(Result.subject)
        ).filter(Result.user_id == user_id).order_by(Result.semester.asc(), Result.id.asc()).all()

        # Group by semester
        semesters_map: Dict[int, List[Result]] = {}
        for r in results:
            semesters_map.setdefault(r.semester, []).append(r)

        sem_summaries: List[SemesterResultSummary] = []
        sgpa_trend: List[SGPATrendItem] = []
        total_credit_points = 0.0
        total_registered_credits = 0
        total_earned_credits = 0

        for sem_num in sorted(semesters_map.keys()):
            sem_results = semesters_map[sem_num]
            items: List[SubjectResultItem] = []
            sem_credits = 0
            sem_earned_credits = 0
            sem_points = 0.0

            for res in sem_results:
                subj_credits = res.subject.credits if res.subject and res.subject.credits else 3
                sem_credits += subj_credits
                if res.grade_point > 0:
                    sem_earned_credits += subj_credits
                
                sem_points += (subj_credits * res.grade_point)

                items.append(SubjectResultItem(
                    id=res.id,
                    subject_id=res.subject_id,
                    subject_name=res.subject.name if res.subject else "Subject",
                    subject_code=res.subject.code if res.subject else "SUB",
                    credits=subj_credits,
                    semester=res.semester,
                    midsem_marks=res.midsem_marks,
                    endsem_marks=res.endsem_marks,
                    assignment_marks=res.assignment_marks,
                    total=res.total,
                    grade=res.grade,
                    grade_point=res.grade_point
                ))

            sgpa = round(sem_points / sem_credits, 2) if sem_credits > 0 else 0.0

            # Update or create cached SemesterResult record
            sem_record = db.query(SemesterResult).filter(
                and_(SemesterResult.user_id == user_id, SemesterResult.semester == sem_num)
            ).first()
            if not sem_record:
                sem_record = SemesterResult(
                    user_id=user_id,
                    semester=sem_num,
                    sgpa=sgpa,
                    credits_earned=sem_earned_credits,
                    total_credits=sem_credits
                )
                db.add(sem_record)
            else:
                sem_record.sgpa = sgpa
                sem_record.credits_earned = sem_earned_credits
                sem_record.total_credits = sem_credits

            total_credit_points += sem_points
            total_registered_credits += sem_credits
            total_earned_credits += sem_earned_credits

            sem_summaries.append(SemesterResultSummary(
                semester=sem_num,
                sgpa=sgpa,
                credits_earned=sem_earned_credits,
                total_credits=sem_credits,
                subjects=items
            ))

            sgpa_trend.append(SGPATrendItem(
                semester=sem_num,
                sgpa=sgpa,
                credits_earned=sem_earned_credits
            ))

        db.commit()

        cgpa = round(total_credit_points / total_registered_credits, 2) if total_registered_credits > 0 else 0.0

        return StudentResultsResponse(
            user_id=user.id,
            student_name=user.full_name or "Student",
            roll_number=user.roll_number,
            cgpa=cgpa,
            total_credits_earned=total_earned_credits,
            sgpa_trend=sgpa_trend,
            semesters=sem_summaries
        )

    @staticmethod
    def is_teacher_allowed_for_subject(db: Session, teacher: User, subject_id: int) -> bool:
        """Admins can upload for any subject. Teachers can upload for any subject or courses they teach."""
        if teacher.role == "admin":
            return True
        # For teacher, verify subject exists
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        return subject is not None

    @staticmethod
    async def process_results_upload(
        db: Session,
        file: UploadFile,
        current_user: User,
        dry_run: bool = False
    ) -> Any:
        """Parses CSV or XLSX, validates every row, recomputes SGPA/CGPA, and upserts in one transaction."""
        filename = (file.filename or "").lower()
        if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Please upload a .csv or .xlsx file."
            )

        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")

        # Read rows
        rows: List[Dict[str, Any]] = []
        if filename.endswith(".csv"):
            text_stream = io.StringIO(content.decode("utf-8-sig", errors="replace"))
            reader = csv.DictReader(text_stream)
            for idx, r in enumerate(reader, start=2): # Header is line 1
                rows.append({"row_num": idx, **{k.strip().lower(): (v.strip() if v else "") for k, v in r.items() if k}})
        else:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = wb.active
            header_keys = []
            for col_idx, cell in enumerate(sheet[1], start=1):
                header_keys.append(str(cell.value or "").strip().lower())
            
            for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                if not any(row):
                    continue
                row_dict = {"row_num": row_idx}
                for k, v in zip(header_keys, row):
                    if k:
                        row_dict[k] = str(v).strip() if v is not None else ""
                rows.append(row_dict)

        if not rows:
            raise HTTPException(status_code=400, detail="The uploaded file contains no data rows.")

        errors: List[RowValidationError] = []
        preview_rows: List[UploadPreviewRow] = []
        valid_records: List[Dict[str, Any]] = []

        # Cache subjects and users to avoid N+1 DB roundtrips
        all_subjects = {s.code.upper(): s for s in db.query(Subject).all()}
        all_users_by_email = {u.email.lower(): u for u in db.query(User).all()}
        all_users_by_roll = {u.roll_number.upper(): u for u in db.query(User).filter(User.roll_number.isnot(None)).all()}

        for r in rows:
            row_num = r["row_num"]
            identifier = r.get("roll_number") or r.get("email") or r.get("student_id") or ""
            subj_code = (r.get("subject_code") or r.get("code") or "").upper()
            sem_str = r.get("semester") or ""

            if not identifier:
                errors.append(RowValidationError(row_number=row_num, identifier="N/A", error="Missing student roll_number or email"))
                continue

            # Match student
            student = all_users_by_roll.get(identifier.upper()) or all_users_by_email.get(identifier.lower())
            if not student:
                errors.append(RowValidationError(row_number=row_num, identifier=identifier, error=f"Student '{identifier}' not found in system"))
                continue

            # Match subject
            subject = all_subjects.get(subj_code)
            if not subject:
                errors.append(RowValidationError(row_number=row_num, identifier=identifier, error=f"Subject code '{subj_code}' not found"))
                continue

            # Permission check for teacher
            if current_user.role == "teacher" and not ResultsService.is_teacher_allowed_for_subject(db, current_user, subject.id):
                errors.append(RowValidationError(row_number=row_num, identifier=identifier, error=f"You do not have permission to upload for subject '{subj_code}'"))
                continue

            # Validate semester
            try:
                sem = int(sem_str)
                if sem < 1 or sem > 8:
                    raise ValueError()
            except ValueError:
                errors.append(RowValidationError(row_number=row_num, identifier=identifier, error=f"Invalid semester '{sem_str}'. Must be between 1 and 8"))
                continue

            # Validate marks
            try:
                mid = float(r.get("midsem_marks") or 0.0)
                end = float(r.get("endsem_marks") or 0.0)
                asn = float(r.get("assignment_marks") or 0.0)

                if mid < 0 or mid > MAX_MARKS_CONFIG["midsem"]:
                    errors.append(RowValidationError(row_number=row_num, identifier=identifier, error=f"Midsem marks {mid} out of range (0-{MAX_MARKS_CONFIG['midsem']})"))
                    continue
                if end < 0 or end > MAX_MARKS_CONFIG["endsem"]:
                    errors.append(RowValidationError(row_number=row_num, identifier=identifier, error=f"Endsem marks {end} out of range (0-{MAX_MARKS_CONFIG['endsem']})"))
                    continue
                if asn < 0 or asn > MAX_MARKS_CONFIG["assignment_marks" if "assignment_marks" in MAX_MARKS_CONFIG else "assignment"]:
                    errors.append(RowValidationError(row_number=row_num, identifier=identifier, error=f"Assignment marks {asn} out of range (0-{MAX_MARKS_CONFIG['assignment']})"))
                    continue

            except ValueError:
                errors.append(RowValidationError(row_number=row_num, identifier=identifier, error="Marks must be valid numeric numbers"))
                continue

            total = round(mid + end + asn, 2)
            grade, grade_point = calculate_grade(total)

            preview_rows.append(UploadPreviewRow(
                row_number=row_num,
                student_name=student.full_name or "Student",
                identifier=identifier,
                subject_code=subject.code,
                semester=sem,
                midsem_marks=mid,
                endsem_marks=end,
                assignment_marks=asn,
                total=total,
                grade=grade,
                grade_point=grade_point
            ))

            valid_records.append({
                "user_id": student.id,
                "subject_id": subject.id,
                "semester": sem,
                "midsem_marks": mid,
                "endsem_marks": end,
                "assignment_marks": asn,
                "total": total,
                "grade": grade,
                "grade_point": grade_point
            })

        # Dry run response
        if dry_run:
            return UploadDryRunResponse(
                dry_run=True,
                total_rows=len(rows),
                valid_rows_count=len(valid_records),
                error_count=len(errors),
                errors=errors,
                preview=preview_rows[:50], # first 50 rows for preview
                message="Dry run complete. Review errors and preview before committing." if errors else "Validation successful! All rows are valid and ready to import."
            )

        # If not dry run and errors exist, reject import to maintain all-or-nothing atomicity
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": f"Upload failed with {len(errors)} validation error(s). No records were modified.",
                    "errors": [e.model_dump() for e in errors[:20]]
                }
            )

        # Commit all valid rows in one atomic transaction
        affected_students = set()
        for rec in valid_records:
            affected_students.add((rec["user_id"], rec["semester"]))
            existing = db.query(Result).filter(
                and_(
                    Result.user_id == rec["user_id"],
                    Result.subject_id == rec["subject_id"],
                    Result.semester == rec["semester"]
                )
            ).first()

            if existing:
                existing.midsem_marks = rec["midsem_marks"]
                existing.endsem_marks = rec["endsem_marks"]
                existing.assignment_marks = rec["assignment_marks"]
                existing.total = rec["total"]
                existing.grade = rec["grade"]
                existing.grade_point = rec["grade_point"]
            else:
                new_res = Result(**rec)
                db.add(new_res)

        db.commit()

        # Recompute SemesterResult for affected students
        for s_user_id, s_sem in affected_students:
            ResultsService.get_student_results(db, s_user_id)

        return UploadCommitResponse(
            success=True,
            inserted_or_updated=len(valid_records),
            semesters_recomputed=len(affected_students),
            message=f"Successfully imported {len(valid_records)} grade record(s) across {len(affected_students)} semester result(s)."
        )

