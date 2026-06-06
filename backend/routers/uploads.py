import os
import uuid
import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from fastapi import status
from sqlalchemy.orm import Session
from starlette.status import HTTP_201_CREATED, HTTP_404_NOT_FOUND

from database import SessionLocal
import models, schemas
from services.extraction import extract_from_document
from services.validation import validate_record

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}

async def run_extraction(upload_id: int, db: Session):
    try:
        upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
        if not upload:
            return None
            
        extracted_record = db.query(models.ExtractedRecord).filter(models.ExtractedRecord.upload_id == upload_id).first()
        if not extracted_record:
            extracted_record = models.ExtractedRecord(upload_id=upload_id)
            db.add(extracted_record)
            
        upload.status = "extracting"
        db.commit()
        
        result = await extract_from_document(upload.file_path, upload.file_type)
        errors = validate_record(result["fields"])
        
        for field, value in result["fields"].items():
            if hasattr(extracted_record, field):
                setattr(extracted_record, field, value)
                
        extracted_record.confidence_scores = json.dumps(result["confidence_scores"])
        extracted_record.raw_extraction = json.dumps(result)
        extracted_record.validation_errors = json.dumps(errors)
        extracted_record.review_status = "pending"
        
        upload.status = "review_pending"
        db.commit()
        db.refresh(extracted_record)
        return extracted_record
        
    except Exception as e:
        upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
        if upload:
            upload.status = "uploaded"
            db.commit()
        raise e

async def run_extraction_bg(upload_id: int):
    db = SessionLocal()
    try:
        await run_extraction(upload_id, db)
    finally:
        db.close()

@router.post("/", response_model=schemas.UploadRecordOut, status_code=HTTP_201_CREATED)
async def create_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    ext = file.filename.split('.')[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(upload_dir, unique_name)
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    upload_record = models.UploadRecord(
        filename=file.filename,
        file_path=file_path,
        file_type="pdf" if ext == "pdf" else "image",
        status="uploaded",
    )
    db.add(upload_record)
    db.commit()
    db.refresh(upload_record)

    # create blank extracted record linked to this upload
    blank = models.ExtractedRecord(upload_id=upload_record.id)
    db.add(blank)
    db.commit()

    background_tasks.add_task(run_extraction_bg, upload_record.id)

    return upload_record

@router.post("/{upload_id}/extract", response_model=schemas.ExtractedRecordOut)
async def extract_record(upload_id: int, db: Session = Depends(get_db)):
    upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Upload not found")
        
    try:
        extracted_record = await run_extraction(upload_id, db)
        return extracted_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[schemas.UploadRecordOut])
def list_uploads(db: Session = Depends(get_db)):
    return db.query(models.UploadRecord).order_by(models.UploadRecord.uploaded_at.desc()).all()


@router.get("/{upload_id}", response_model=schemas.UploadRecordOut)
def get_upload(upload_id: int, db: Session = Depends(get_db)):
    upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Upload not found")
    return upload


@router.delete("/{upload_id}", status_code=204)
def delete_upload(upload_id: int, db: Session = Depends(get_db)):
    upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Upload not found")
    try:
        if os.path.exists(upload.file_path):
            os.remove(upload.file_path)
    except Exception:
        pass
    db.delete(upload)
    db.commit()
    return
