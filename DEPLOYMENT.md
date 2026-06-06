# BiztelAI DocFlow - Deployment Guide

## Live URLs
- **Frontend**: https://biztelai-frontend.web.app
- **Backend API**: https://biztelai-backend-bqmz.onrender.com
- **API Docs**: https://biztelai-backend-bqmz.onrender.com/docs
- **GitHub**: https://github.com/Code-X-utkarsh/BiztelAI-Assignment
This guide covers setting up Google Cloud Platform (GCP) for the backend and Firebase Hosting for the frontend.

## Section 1 — One-time GCP Setup
1. Create a GCP project at [console.cloud.google.com](https://console.cloud.google.com).
2. Note your **Project ID**.
3. Enable the following APIs:
   - Navigation: **APIs & Services > Library**
   - Search for and enable: **Cloud Run API**
   - Search for and enable: **Artifact Registry API**
4. Create a Service Account:
   - Navigation: **IAM & Admin > Service Accounts > Create Service Account**
   - Name it `github-actions-deploy`.
   - Grant the following roles:
     - Cloud Run Admin
     - Artifact Registry Writer
     - Storage Admin
5. Create and download the JSON key:
   - Click the newly created service account.
   - Go to the **Keys** tab > **Add Key** > **Create new key** (JSON format).
   - Download the file securely.
6. Copy the *entire contents* of this JSON file to add as a GitHub Secret (`GCP_SA_KEY`).

## Section 2 — One-time Firebase Setup
1. Go to [firebase.google.com](https://firebase.google.com).
2. Click **Add project** and select your existing GCP project.
3. Open your terminal and navigate to the `frontend/` directory:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```
4. Answer the initialization prompts:
   - Public directory: `dist`
   - Configure as single-page app (SPA): `Yes`
   - Overwrite index.html: `No`
5. Generate a CI token for GitHub Actions:
   ```bash
   firebase login:ci
   ```
6. Copy the output token and save it as a GitHub Secret (`FIREBASE_TOKEN`).

## Section 3 — GitHub Secrets needed
In your GitHub repository, navigate to **Settings > Secrets and variables > Actions**. Add the following repository secrets:

- `GCP_SA_KEY`: The entire contents of your GCP Service Account JSON file.
- `GCP_PROJECT_ID`: Your exact GCP Project ID.
- `GCP_REGION`: The region to deploy to (e.g., `us-central1`).
- `GEMINI_API_KEY`: Your Google Gemini API key from [aistudio.google.com](https://aistudio.google.com).
- `NVIDIA_API_KEY`: Your NVIDIA API key from [build.nvidia.com](https://build.nvidia.com).
- `AI_PROVIDER`: Either `gemini` or `nvidia`.
- `FIREBASE_TOKEN`: The token generated from `firebase login:ci`.

## Section 4 — How to deploy
- The CI/CD pipelines are fully automated via GitHub Actions.
- Simply push your changes to the `main` branch.
- **For the first deployment:** Go to the **Actions** tab in GitHub and manually run the backend and frontend workflows if they didn't trigger automatically.

## Section 5 — Local dev with Docker
You can run the entire production-like environment locally using Docker Compose:

```bash
docker-compose up --build
```
- Backend will be available at `http://localhost:8000`
- Frontend will be available at `http://localhost:5173`
