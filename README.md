# BiztelAI DocFlow

## 🚀 Live Demo
| | URL |
|---|---|
| Frontend | https://biztelai-frontend.web.app |
| Backend API | https://biztelai-backend-bqmz.onrender.com |
| API Docs (Swagger) | https://biztelai-backend-bqmz.onrender.com/docs |
| GitHub | https://github.com/Code-X-utkarsh/BiztelAI-Assignment |

> Note: Backend is on Render free tier. 
> First request after inactivity may take ~50 seconds to wake up.

## What It Does
BiztelAI DocFlow is an AI-powered manufacturing document digitization system. It allows factory workers to upload scanned handwritten production logs, automatically extracts critical data fields using Google's Gemini Vision AI, and provides a sleek interface to review, approve, and analyze the digitized records.

## Tech Stack
- **Backend**: FastAPI, Python 3.11+, SQLAlchemy, SQLite
- **Frontend**: React, Vite, Tailwind CSS, Recharts, React Router
- **AI Integration**: Google Gemini 1.5 Flash

## Architecture Overview
- **Upload Flow**: A document is uploaded via the frontend and saved to the backend `/uploads` directory. An `UploadRecord` is created, and an asynchronous background task is triggered.
- **AI Extraction**: The background task sends the image to Gemini Vision with a strict prompt to extract specific fields (shift, machine number, etc.) and generate a confidence score for each.
- **Validation**: Extracted data is validated against specific business rules (e.g., quantity <= 10000). Any validation failures are flagged for review.
- **Review & Approval**: The user reviews the extracted data, makes corrections if necessary, and approves it. The approved data is then visualized in a real-time Recharts dashboard.

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Google Gemini API key (free tier works)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Add your GEMINI_API_KEY to .env
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Environment Variables
| Variable | Required | Default | Description |
|---|---|---|---|
| GEMINI_API_KEY | Yes | — | Google Gemini API key |
| UPLOAD_DIR | No | uploads | Directory for uploaded files |
| MAX_FILE_SIZE_MB | No | 10 | Max upload size in MB |

## Assumptions & Tradeoffs
- **SQLite**: Used for simplicity and ease of setup during the prototype phase, but should be migrated to PostgreSQL for production.
- **Single-User Assumption**: Currently, there is no authentication or multi-tenant isolation, assuming a single trusted environment for now.
- **Local File Storage**: Uploaded files are saved to the local disk. In a production environment, this should be migrated to an S3-compatible object storage service.

## AI Providers (Gemini vs NVIDIA)
BiztelAI DocFlow supports dual AI extraction providers. You can toggle between Google Gemini 1.5 Flash and NVIDIA Llama 3.2 90B Vision by changing the `AI_PROVIDER` environment variable.
- Set `AI_PROVIDER=gemini` and provide `GEMINI_API_KEY`.
- Set `AI_PROVIDER=nvidia` and provide `NVIDIA_API_KEY`.

## Docker Local Setup
You can run the entire production-like environment locally using Docker Compose without needing to install Node.js or Python directly.
```bash
docker-compose up --build
```
- Backend runs on `http://localhost:8000`
- Frontend runs on `http://localhost:5173`

## Documentation Links
- **[Deployment Guide](DEPLOYMENT.md)**: Step-by-step CI/CD setup for Google Cloud Run, Firebase Hosting, and GitHub Actions.
- **[AI Engineering Workflow](AI_WORKFLOW.md)**: Detailed technical notes on AI prompt engineering, system design, and the agentic coding approach.
