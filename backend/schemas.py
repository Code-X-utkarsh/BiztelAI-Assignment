"""Pydantic schemas for API responses and requests."""

from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel


class ExtractedRecordOut(BaseModel):
    id: int
    upload_id: int
    date: Optional[str]
    shift: Optional[str]
    employee_number: Optional[str]
    operation_code: Optional[str]
    machine_number: Optional[str]
    work_order_number: Optional[str]
    quantity_produced: Optional[float]
    time_taken: Optional[float]
    raw_extraction: Optional[str]
    confidence_scores: Optional[Any]
    validation_errors: Optional[Any]
    review_status: str
    reviewer_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class UploadRecordOut(BaseModel):
    id: int
    filename: str
    file_path: str
    file_type: str
    status: str
    uploaded_at: datetime
    records: list[ExtractedRecordOut] = []

    class Config:
        orm_mode = True


class ExtractedRecordUpdate(BaseModel):
    date: Optional[str] = None
    shift: Optional[str] = None
    employee_number: Optional[str] = None
    operation_code: Optional[str] = None
    machine_number: Optional[str] = None
    work_order_number: Optional[str] = None
    quantity_produced: Optional[float] = None
    time_taken: Optional[float] = None
    reviewer_notes: Optional[str] = None


class ShiftSummaryItem(BaseModel):
    shift: str
    count: int
    avg_quantity: Optional[float]

class MachineSummaryItem(BaseModel):
    machine_number: str
    count: int
    total_quantity: Optional[float]

class QuantitySummary(BaseModel):
    total_quantity_produced: Optional[float]
    avg_quantity_per_record: Optional[float]
    max_quantity: Optional[float]
    min_quantity: Optional[float]

class RecentActivityItem(BaseModel):
    upload_id: int
    filename: str
    status: str
    uploaded_at: datetime
    review_status: Optional[str]

class StatusBreakdown(BaseModel):
    uploaded: int
    extracting: int
    review_pending: int
    reviewed: int
    approved: int

class AnalyticsSummary(BaseModel):
    total_uploads: int
    total_extracted: int
    total_approved: int
    total_validation_failures: int
    avg_confidence: float
    shift_summary: List[ShiftSummaryItem]
    machine_summary: List[MachineSummaryItem]
    quantity_summary: QuantitySummary
    status_breakdown: StatusBreakdown
    recent_activity: List[RecentActivityItem]

class ExtractedRecordWithFilename(BaseModel):
    id: int
    upload_id: int
    filename: str
    date: Optional[str]
    shift: Optional[str]
    employee_number: Optional[str]
    operation_code: Optional[str]
    machine_number: Optional[str]
    work_order_number: Optional[str]
    quantity_produced: Optional[float]
    time_taken: Optional[float]
    confidence_scores: Optional[str]
    validation_errors: Optional[str]
    review_status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class PaginatedRecordsResponse(BaseModel):
    items: List[ExtractedRecordWithFilename]
    total: int
    page: int
    page_size: int
    total_pages: int
