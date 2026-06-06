"""Analytics summary endpoint for BiztelAI DocFlow."""

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, cast, Date

from database import SessionLocal
import models, schemas

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/summary", response_model=schemas.AnalyticsSummary)
async def get_summary(db: Session = Depends(get_db)):
    total_uploads = db.query(func.count(models.UploadRecord.id)).scalar() or 0
    total_extracted = (
        db.query(func.count(models.ExtractedRecord.id))
        .filter(models.ExtractedRecord.review_status != "pending")
        .scalar() or 0
    )
    total_approved = (
        db.query(func.count(models.ExtractedRecord.id))
        .filter(models.ExtractedRecord.review_status == "approved")
        .scalar() or 0
    )
    total_validation_failures = (
        db.query(func.count(models.ExtractedRecord.id))
        .filter(models.ExtractedRecord.validation_errors.isnot(None))
        .filter(models.ExtractedRecord.validation_errors.notin_(["[]", "{}", "", "null"]))
        .scalar() or 0
    )

    # Calculate average confidence
    confidence_rows = db.query(models.ExtractedRecord.confidence_scores).filter(models.ExtractedRecord.confidence_scores.isnot(None)).all()
    all_scores = []
    for (scores_str,) in confidence_rows:
        if not scores_str:
            continue
        try:
            scores_dict = json.loads(scores_str)
            for v in scores_dict.values():
                if isinstance(v, (int, float)):
                    all_scores.append(v)
        except Exception:
            pass

    avg_confidence = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0

    shift_rows = (
        db.query(
            models.ExtractedRecord.shift,
            func.count(models.ExtractedRecord.id),
            func.avg(models.ExtractedRecord.quantity_produced),
        )
        .filter(models.ExtractedRecord.shift.isnot(None))
        .group_by(models.ExtractedRecord.shift)
        .all()
    )
    shift_summary = [
        schemas.ShiftSummaryItem(
            shift=r[0], 
            count=r[1], 
            avg_quantity=round(r[2], 2) if r[2] is not None else None
        ) for r in shift_rows
    ]

    machine_rows = (
        db.query(
            models.ExtractedRecord.machine_number,
            func.count(models.ExtractedRecord.id),
            func.sum(models.ExtractedRecord.quantity_produced),
        )
        .filter(models.ExtractedRecord.machine_number.isnot(None))
        .group_by(models.ExtractedRecord.machine_number)
        .order_by(func.sum(models.ExtractedRecord.quantity_produced).desc())
        .limit(10)
        .all()
    )
    machine_summary = [
        schemas.MachineSummaryItem(
            machine_number=r[0], 
            count=r[1], 
            total_quantity=round(r[2], 2) if r[2] is not None else None
        ) for r in machine_rows
    ]

    qty_row = db.query(
        func.sum(models.ExtractedRecord.quantity_produced),
        func.avg(models.ExtractedRecord.quantity_produced),
        func.max(models.ExtractedRecord.quantity_produced),
        func.min(models.ExtractedRecord.quantity_produced),
    ).filter(models.ExtractedRecord.quantity_produced.isnot(None)).first()

    quantity_summary = schemas.QuantitySummary(
        total_quantity_produced=round(qty_row[0], 2) if qty_row and qty_row[0] is not None else None,
        avg_quantity_per_record=round(qty_row[1], 2) if qty_row and qty_row[1] is not None else None,
        max_quantity=round(qty_row[2], 2) if qty_row and qty_row[2] is not None else None,
        min_quantity=round(qty_row[3], 2) if qty_row and qty_row[3] is not None else None,
    )

    status_counts = (
        db.query(models.UploadRecord.status, func.count(models.UploadRecord.id))
        .group_by(models.UploadRecord.status)
        .all()
    )
    status_dict = {status: cnt for status, cnt in status_counts}
    
    status_breakdown = schemas.StatusBreakdown(
        uploaded=status_dict.get("uploaded", 0),
        extracting=status_dict.get("extracting", 0),
        review_pending=status_dict.get("review_pending", 0),
        reviewed=status_dict.get("reviewed", 0),
        approved=status_dict.get("approved", 0),
    )

    recent_rows = (
        db.query(models.UploadRecord, models.ExtractedRecord)
        .outerjoin(models.ExtractedRecord, models.ExtractedRecord.upload_id == models.UploadRecord.id)
        .order_by(models.UploadRecord.uploaded_at.desc())
        .limit(5)
        .all()
    )
    
    recent_activity = [
        schemas.RecentActivityItem(
            upload_id=u.id,
            filename=u.filename,
            status=u.status,
            uploaded_at=u.uploaded_at,
            review_status=e.review_status if e else None
        ) for u, e in recent_rows
    ]

    return schemas.AnalyticsSummary(
        total_uploads=total_uploads,
        total_extracted=total_extracted,
        total_approved=total_approved,
        total_validation_failures=total_validation_failures,
        avg_confidence=avg_confidence,
        shift_summary=shift_summary,
        machine_summary=machine_summary,
        quantity_summary=quantity_summary,
        status_breakdown=status_breakdown,
        recent_activity=recent_activity
    )
