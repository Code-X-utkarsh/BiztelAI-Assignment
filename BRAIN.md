# BiztelAI DocFlow — Project Brain

## Project Purpose
BiztelAI DocFlow is an AI-powered document digitization system tailored for manufacturing. It automates the extraction, validation, and management of data from handwritten and semi-structured operational documents using Gemini Vision AI.

## Tech Stack
Backend: FastAPI, SQLAlchemy, SQLite (biztelai.db), Uvicorn
Frontend: React 18, Vite, Tailwind CSS v3, React Router v6, Axios, Lucide React, Recharts
AI: Google Gemini Vision API (model: gemini-1.5-flash)
Deployment: TBD

## Folder Structure
```
biztel-ai/
├── backend/
│   ├── .env
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── schemas.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── analytics.py
│   │   ├── records.py
│   │   └── uploads.py
│   └── services/
│       ├── extraction.py
│       └── validation.py
├── frontend/
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── api/
│       │   └── axios.js
│       ├── components/
│       │   ├── FileUploadCard.jsx
│       │   ├── Navbar.jsx
│       │   └── Sidebar.jsx
│       └── pages/
│           ├── DashboardPage.jsx
│           ├── HistoryPage.jsx
│           ├── ReviewPage.jsx
│           └── UploadPage.jsx
├── README.md
├── AI_WORKFLOW.md
└── .env.example
```

## Database Models
### UploadRecord (table: upload_records)
- id: Integer PK
- filename: String — original file name
- file_path: String — path to stored file
- file_type: String — "image" or "pdf"
- status: String — "uploaded", "extracting", "review_pending", "reviewed", "approved"
- uploaded_at: DateTime — timestamp of upload

### ExtractedRecord (table: extracted_records)
- id: Integer PK
- upload_id: FK → upload_records.id
- date: String
- shift: String
- employee_number: String
- operation_code: String
- machine_number: String
- work_order_number: String
- quantity_produced: Float
- time_taken: Float
- raw_extraction: Text
- confidence_scores: Text
- validation_errors: Text
- review_status: String — "pending", "reviewed", "approved"
- reviewer_notes: String
- created_at: DateTime
- updated_at: DateTime

## API Endpoints
- POST /api/uploads/ — uploads a file, creates UploadRecord + blank ExtractedRecord
- POST /api/uploads/{upload_id}/extract — manually triggers/re-runs Gemini extraction
- GET /api/uploads/ — returns all uploads
- GET /api/uploads/{upload_id} — returns an upload (with its extracted records)
- DELETE /api/uploads/{upload_id} — deletes an upload
- GET /api/records/ — returns paginated records (with filtering & search)
- GET /api/records/{record_id} — returns a record
- PATCH /api/records/{record_id} — updates a record
- POST /api/records/{record_id}/approve — marks a record as approved
- GET /api/analytics/summary — returns complex analytics aggregations

## Frontend Pages & Routes
- / → redirects to /upload
- /upload → UploadPage — allows user to upload documents and view recent uploads
- /review/:uploadId → ReviewPage — lets users review and edit extracted fields
- /history → HistoryPage — table showing historical extractions with filtering and pagination
- /dashboard → DashboardPage — displays system analytics and metrics using Recharts

## Extraction Schema
Fields extracted from documents:
- date: String — date on the document
- shift: String — Morning / Evening / Night
- employee_number: String — employee ID
- operation_code: String — operation type code
- machine_number: String — format MC-XX
- work_order_number: String — unique job identifier
- quantity_produced: Float — units made
- time_taken: Float — hours worked

## Confidence Score System
- Stored as JSON string in extracted_records.confidence_scores
- Per-field score from 0.0 to 1.0
- UI color coding: green >0.8, yellow 0.5–0.8, red <0.5

## Validation Rules
List all validation rules in services/validation.py:
1. date, employee_number, work_order_number are mandatory
2. shift must be Morning, Evening, or Night
3. machine_number must match regex ^MC-\d+$
4. quantity_produced must be > 0 and <= 10000
5. time_taken must be > 0 and <= 24

## Record Status Flow
UploadRecord.status:
uploaded → extracting → review_pending → reviewed → approved

ExtractedRecord.review_status:
pending → reviewed → approved

## Environment Variables
GEMINI_API_KEY — Google Gemini API key (required for extraction)
NVIDIA_API_KEY — NVIDIA API key (required for Llama Vision extraction)
AI_PROVIDER — Select extraction model (default: "nvidia", options: "gemini" or "nvidia")
UPLOAD_DIR — folder where uploaded files are stored (default: uploads)
MAX_FILE_SIZE_MB — max upload size (default: 10)

## What Has Been Built (Phase 1 & 2 & 3 — Complete)
- Project scaffold and basic folder structure
- Database configuration (SQLite, SQLAlchemy)
- Upload endpoints and file saving functionality
- Basic CRUD operations for ExtractedRecords
- Skeleton frontend pages with routing
- Simple analytics aggregation logic
- **Gemini Vision extraction pipeline**
- **Confidence scoring from Gemini response**
- **Extract button on frontend**
- **Auto-run validation after extraction**
- **Real-time extraction status updates**
- **Phase 3: Premium UI Overhaul and Analytics Deepening**
  - **Glassmorphism Design System**: Dark theme with gradient backgrounds.
  - **Dashboard**: Recharts integration (Bar, Pie charts), Stat Cards.
  - **History Page**: Debounced search, pagination, multiple filters.
  - **Backend Analytics**: Complex SQLAlchemy aggregations and Pydantic schemas.
  - **Documentation**: AI_WORKFLOW.md and comprehensive README.md.
  - **Dual AI Providers**: Support for both Gemini Vision and NVIDIA Llama Vision toggled via ENV.
  - **Robust JSON Parsing**: Advanced substring parsing to extract JSON from conversational AI outputs.
  - **Vite Proxy Fixes**: Configured local proxying to serve document previews reliably.

## What Is In Progress (Phase 5 — Finalization)
- Final QA testing
- Demo video creation
- AGENTS.md documentation polish

## Deployment Architecture
**Live URLs:**
- **Frontend**: https://biztelai-frontend.web.app
- **Backend API**: https://biztelai-backend-bqmz.onrender.com
- **API Docs**: https://biztelai-backend-bqmz.onrender.com/docs
- **GitHub**: https://github.com/Code-X-utkarsh/BiztelAI-Assignment

- **Backend**: Containerized with Docker, deployed to Google Cloud Run (Serverless) / Render.
- **Frontend**: Built with Vite, deployed to Firebase Hosting (SPA configuration).
- **CI/CD**: Fully automated pipelines using GitHub Actions triggered on push to `main`.
- **Local Dev**: Configured with `docker-compose up --build` for parity with production.

## Known Issues / Bugs Found During Code Review
- **Backend**: `schemas.UploadRecordOut` did not include the `records` list. Fixed.
- **Frontend**: `Sidebar.jsx` used `NavLink` with `isActive` prop instead of `useLocation`. Fixed.
- **Frontend**: `package.json` and `index.css` were missing. Created and properly setup.

## Phases Roadmap
- Phase 1: Project scaffold, DB, file upload, blank review form ✅
- Phase 2: Gemini extraction, confidence scores, validation wiring ✅
- Phase 3: Premium UI Overhaul, Analytics API, Dashboard, History Pages ✅
- Phase 4: CI/CD Deployment, Docker, GitHub Actions, Prompt Engineering Improvements ✅
- Phase 5: Final QA, demo video, AGENTS.md polish 🔄 (current)

## Last Updated
2026-06-06. Completed Phase 4. Deployment pipeline, Docker files, and extraction accuracy improvements live. Ready for Phase 5.
