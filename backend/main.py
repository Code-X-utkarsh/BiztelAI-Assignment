"""FastAPI application entry point for BiztelAI DocFlow API."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import uploads, records, analytics

app = FastAPI(title="BiztelAI DocFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "*"  # remove this line before production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(records.router, prefix="/api/records", tags=["records"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
