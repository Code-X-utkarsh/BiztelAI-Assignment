"""SQLAlchemy models for uploads and extracted records."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class UploadRecord(Base):
    __tablename__ = "upload_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "image" or "pdf"
    status = Column(String, nullable=False, default="uploaded")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    records = relationship(
        "ExtractedRecord",
        back_populates="upload",
        cascade="all, delete-orphan",
    )


class ExtractedRecord(Base):
    __tablename__ = "extracted_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    upload_id = Column(Integer, ForeignKey("upload_records.id"), nullable=False)
    date = Column(String, nullable=True)
    shift = Column(String, nullable=True)
    employee_number = Column(String, nullable=True)
    operation_code = Column(String, nullable=True)
    machine_number = Column(String, nullable=True)
    work_order_number = Column(String, nullable=True)
    quantity_produced = Column(Float, nullable=True)
    time_taken = Column(Float, nullable=True)
    raw_extraction = Column(Text, nullable=True)
    confidence_scores = Column(Text, nullable=True)
    validation_errors = Column(Text, nullable=True)
    review_status = Column(String, default="pending", nullable=False)
    reviewer_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    upload = relationship("UploadRecord", back_populates="records")
