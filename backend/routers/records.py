"""Router for CRUD operations on ExtractedRecord objects."""

import math
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from starlette.status import HTTP_404_NOT_FOUND

from database import SessionLocal
import models, schemas

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=schemas.PaginatedRecordsResponse)
def list_records(
    shift: str | None = Query(None),
    machine_number: str | None = Query(None),
    review_status: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.ExtractedRecord, models.UploadRecord.filename).join(
        models.UploadRecord, models.UploadRecord.id == models.ExtractedRecord.upload_id
    )

    if shift:
        query = query.filter(models.ExtractedRecord.shift == shift)
    if machine_number:
        query = query.filter(models.ExtractedRecord.machine_number == machine_number)
    if review_status:
        query = query.filter(models.ExtractedRecord.review_status == review_status)
    if date_from:
        query = query.filter(models.ExtractedRecord.date >= date_from)
    if date_to:
        query = query.filter(models.ExtractedRecord.date <= date_to)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.ExtractedRecord.work_order_number.ilike(like),
                models.ExtractedRecord.employee_number.ilike(like),
                models.ExtractedRecord.operation_code.ilike(like),
                models.ExtractedRecord.machine_number.ilike(like),
                models.UploadRecord.filename.ilike(like),
            )
        )
    
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    offset = (page - 1) * page_size
    records_with_filename = query.offset(offset).limit(page_size).all()
    
    items = []
    for rec, filename in records_with_filename:
        rec_dict = {
            "id": rec.id,
            "upload_id": rec.upload_id,
            "filename": filename,
            "date": rec.date,
            "shift": rec.shift,
            "employee_number": rec.employee_number,
            "operation_code": rec.operation_code,
            "machine_number": rec.machine_number,
            "work_order_number": rec.work_order_number,
            "quantity_produced": rec.quantity_produced,
            "time_taken": rec.time_taken,
            "confidence_scores": rec.confidence_scores,
            "validation_errors": rec.validation_errors,
            "review_status": rec.review_status,
            "created_at": rec.created_at,
            "updated_at": rec.updated_at,
        }
        items.append(schemas.ExtractedRecordWithFilename(**rec_dict))

    return schemas.PaginatedRecordsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{record_id}", response_model=schemas.ExtractedRecordOut)
def get_record(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(models.ExtractedRecord).filter(models.ExtractedRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Record not found")
    return rec


@router.patch("/{record_id}", response_model=schemas.ExtractedRecordOut)
def update_record(
    record_id: int,
    payload: schemas.ExtractedRecordUpdate,
    db: Session = Depends(get_db),
):
    rec = db.query(models.ExtractedRecord).filter(models.ExtractedRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/{record_id}/approve", response_model=schemas.ExtractedRecordOut)
def approve_record(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(models.ExtractedRecord).filter(models.ExtractedRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Record not found")
    rec.review_status = "approved"
    # also set parent upload status to approved
    upload = db.query(models.UploadRecord).filter(models.UploadRecord.id == rec.upload_id).first()
    if upload:
        upload.status = "approved"
    db.commit()
    db.refresh(rec)
    return rec
