import os
import uuid
import json
import traceback
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from fastapi import status
from sqlalchemy.orm import Session
from starlette.status import HTTP_201_CREATED, HTTP_404_NOT_FOUND

from database import SessionLocal
import models, schemas
from services.extraction import extract_from_document
from services.validation import validate_record

router = APIRouter()
debug_router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}

def resolve_file_path(stored_path: str) -> str:
    """Resolve file path to handle container restarts where uploads directory path may vary."""
    if os.path.exists(stored_path):
        return stored_path
    
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    # Try finding the file in current upload_dir using the basename
    candidate = os.path.join(upload_dir, os.path.basename(stored_path))
    if os.path.exists(candidate):
        print(f"[PATH_RESOLVER] Resolved '{stored_path}' -> '{candidate}'")
        return candidate
    
    abs_candidate = os.path.abspath(candidate)
    if os.path.exists(abs_candidate):
        print(f"[PATH_RESOLVER] Resolved '{stored_path}' -> '{abs_candidate}'")
        return abs_candidate
        
    return stored_path

async def run_extraction(upload_id: int, db: Session):
    print(f"\n[EXTRACTION_PIPELINE] Starting run_extraction for upload_id={upload_id}")
    try:
        upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
        if not upload:
            print(f"[EXTRACTION_PIPELINE] UploadRecord id={upload_id} not found in DB")
            return None
            
        extracted_record = db.query(models.ExtractedRecord).filter(models.ExtractedRecord.upload_id == upload_id).first()
        if not extracted_record:
            extracted_record = models.ExtractedRecord(upload_id=upload_id)
            db.add(extracted_record)
            
        upload.status = "extracting"
        db.commit()
        
        stored_path = upload.file_path
        print(f"[EXTRACTION_PIPELINE] Stored file_path in DB: '{stored_path}'")
        file_path = resolve_file_path(stored_path)
        file_exists = os.path.exists(file_path)
        print(f"[EXTRACTION_PIPELINE] Resolved file_path: '{file_path}' (exists on disk: {file_exists})")
        
        if not file_exists:
            print(f"[EXTRACTION_PIPELINE] WARNING: File '{file_path}' does not exist on disk!")

        result = await extract_from_document(file_path, upload.file_type)
        print(f"[EXTRACTION_PIPELINE] Result returned from extraction service:\n{json.dumps(result, indent=2)}")
        
        errors = validate_record(result["fields"])
        print(f"[EXTRACTION_PIPELINE] Validation errors: {errors}")
        
        for field, value in result["fields"].items():
            if hasattr(extracted_record, field):
                setattr(extracted_record, field, value)
                
        extracted_record.provider_used = result.get("provider_used")
        extracted_record.confidence_scores = json.dumps(result["confidence_scores"])
        extracted_record.raw_extraction = json.dumps(result)
        extracted_record.validation_errors = json.dumps(errors)
        extracted_record.review_status = "pending"

        
        upload.status = "review_pending"
        db.commit()
        db.refresh(extracted_record)
        print(f"[EXTRACTION_PIPELINE] Successfully saved extracted record id={extracted_record.id} for upload_id={upload_id}")
        return extracted_record
        
    except Exception as e:
        print(f"[EXTRACTION_PIPELINE] Exception during extraction for upload_id={upload_id}: {e}")
        traceback.print_exc()
        upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
        if upload:
            upload.status = "uploaded"
            db.commit()
        raise e

async def run_extraction_bg(upload_id: int):
    print(f"[BACKGROUND_TASK] Triggered run_extraction_bg for upload_id={upload_id}")
    db = SessionLocal()
    try:
        await run_extraction(upload_id, db)
        print(f"[BACKGROUND_TASK] Finished run_extraction_bg for upload_id={upload_id}")
    except Exception as e:
        print(f"[BACKGROUND_TASK] Uncaught error in background extraction for upload_id={upload_id}: {e}")
        traceback.print_exc()
    finally:
        db.close()
        print(f"[BACKGROUND_TASK] Closed fresh SessionLocal for upload_id={upload_id}")

def get_debug_env_data():
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    dir_exists = os.path.exists(upload_dir)
    files = os.listdir(upload_dir) if dir_exists else []
    ai_provider = (os.getenv("AI_PROVIDER") or "gemini").lower().strip()
    gemini_key_present = bool((os.getenv("GEMINI_API_KEY") or "").strip())
    nvidia_key_present = bool((os.getenv("NVIDIA_API_KEY") or "").strip())
    system_ok = gemini_key_present or nvidia_key_present
    gemini_status = "ok" if gemini_key_present else "missing"
    nvidia_status = "ok" if nvidia_key_present else "missing"

    return {
        "system_ok": system_ok,
        "active_provider": ai_provider,
        "gemini_status": gemini_status,
        "nvidia_status": nvidia_status,
        "backend_status": "ok",
        "primary_provider": ai_provider,
        "gemini_key_present": gemini_key_present,
        "nvidia_key_present": nvidia_key_present,
        "fallback_enabled": True,
        # Preserving original keys for backward compatibility
        "ai_provider": ai_provider,
        "gemini_api_key_set": gemini_key_present,
        "nvidia_api_key_set": nvidia_key_present,
        "uploads_dir_exists": dir_exists,
        "files_in_uploads": files,
    }



@debug_router.get("/debug/env")
@router.get("/debug/env")
def debug_env():
    return get_debug_env_data()

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
        print(f"[UPLOAD] File saved successfully to: '{file_path}' (size: {len(content)} bytes)")
    except Exception as e:
        print(f"[UPLOAD] Failed to save file to '{file_path}': {e}")
        traceback.print_exc()
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

    print(f"[UPLOAD] Scheduling background extraction task for upload_id={upload_record.id}")
    background_tasks.add_task(run_extraction_bg, upload_record.id)

    return upload_record

@router.post("/{upload_id}/extract", response_model=schemas.ExtractedRecordOut)
async def extract_record(upload_id: int, db: Session = Depends(get_db)):
    print(f"\n[ENDPOINT] POST /api/uploads/{upload_id}/extract initiated")
    upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == upload_id).first()
    if not upload:
        print(f"[ENDPOINT] Upload {upload_id} not found")
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Upload not found")
        
    file_path = resolve_file_path(upload.file_path)
    file_exists = os.path.exists(file_path)
    print(f"[ENDPOINT] Extraction requested for upload_id={upload_id}")
    print(f"[ENDPOINT] Filename: '{upload.filename}'")
    print(f"[ENDPOINT] Passed file_path: '{file_path}'")
    print(f"[ENDPOINT] Does file exist at path: {file_exists}")
    
    try:
        extracted_record = await run_extraction(upload_id, db)
        print(f"[ENDPOINT] Manual extraction finished successfully for upload_id={upload_id}")
        return extracted_record
    except Exception as e:
        print(f"[ENDPOINT] Exception in extract_record endpoint for upload_id={upload_id}: {e}")
        traceback.print_exc()
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
        file_path = resolve_file_path(upload.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass
    db.delete(upload)
    db.commit()
    return

