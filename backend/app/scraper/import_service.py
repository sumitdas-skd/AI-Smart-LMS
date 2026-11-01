from sqlalchemy.orm import Session
from app.models.import_ import ExternalResource, ImportLog
from app.scraper.parsers import BaseParser
from typing import List

class ImportService:
    @staticmethod
    def trigger_import(db: Session, user_id: int, urls: List[str], job_id: int):
        """
        Loops through URLs, parses them, handles duplicates,
        saves to external_resources and logs locally.
        """
        success_count = 0
        
        for url in urls:
            # Duplicate check
            existing = db.query(ExternalResource).filter(ExternalResource.source_url == url).first()
            if existing: # skip duplicate
                log = ImportLog(job_id=job_id, url=url, status="skip", error_message="Duplicate source_url")
                db.add(log)
                db.commit()
                continue
                
            try:
                parsed_data = BaseParser.parse_page(url)
                
                # Assume category note generically if not specified
                resource = ExternalResource(
                    title=parsed_data.get("title"),
                    description=parsed_data.get("description"),
                    source_url=url,
                    category="note",
                    status="pending",
                    file_url=parsed_data.get("file_url")
                )
                db.add(resource)
                db.commit()
                
                log = ImportLog(job_id=job_id, url=url, status="success")
                db.add(log)
                db.commit()
                success_count += 1
            except Exception as e:
                db.rollback()
                log = ImportLog(job_id=job_id, url=url, status="fail", error_message=str(e))
                db.add(log)
                db.commit()
                
        return success_count
