# GitHub & GCP CI/CD Setup Guide

Follow this guide to set up your code repository and automated deployments to Google Cloud and Firebase.

## Step 1 — Create GitHub Repository
1. Go to [github.com](https://github.com) and log in.
2. Click the **New** button to create a new repository.
3. Name it: `biztel-ai`.
4. Set it to **Public** (or Private if you prefer).
5. **DO NOT** check "Add a README file" (we already have one).
6. Click **Create repository**.
7. Open your local terminal in the project folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## Step 2 — GCP Project Setup
1. Go to [console.cloud.google.com](https://console.cloud.google.com) and log in.
2. Click the project dropdown at the top left and select **New Project**.
3. Give it a name and note down the **Project ID** (e.g., `biztel-ai-12345`).
4. Using the top search bar, search for and **Enable** these two APIs:
   - **Cloud Run API**
   - **Artifact Registry API**

## Step 3 — Create Service Account
1. From the top-left hamburger menu, navigate to **IAM & Admin > Service Accounts**.
2. Click **+ Create Service Account**. Name it `github-deploy`.
3. In the "Grant this service account access" step, add these three roles:
   - **Cloud Run Admin**
   - **Artifact Registry Writer**
   - **Storage Admin**
4. Click **Done**.
5. Click on the newly created service account.
6. Go to the **Keys** tab > **Add Key** > **Create new key**.
7. Select **JSON** and click Create. The file will download to your computer.

## Step 4 — GitHub Secrets Setup
1. Go to your GitHub repository page.
2. Click **Settings** > **Secrets and variables** (on the left) > **Actions**.
3. Click **New repository secret**.
4. Add the following secrets exactly as named:
   - `GCP_SA_KEY`: Open the downloaded JSON file from Step 3 in a text editor, copy everything, and paste it here.
   - `GCP_PROJECT_ID`: Paste your GCP Project ID from Step 2.
   - `GCP_REGION`: Use `us-central1`.
   - `GEMINI_API_KEY`: Copy this from your `.env` file (or aistudio.google.com).
   - `NVIDIA_API_KEY`: Copy this from your `.env` file (or build.nvidia.com).
   - `AI_PROVIDER`: Enter either `gemini` or `nvidia`.

## Step 5 — Firebase Setup
1. Go to [firebase.google.com](https://firebase.google.com) and click **Go to console**.
2. Click **Add project**. When asked for a name, select your existing GCP project from the dropdown.
3. Open your local terminal, navigate inside the `frontend/` folder, and run:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```
4. Answer the initialization prompts:
   - What do you want to use as your public directory? `dist`
   - Configure as a single-page app (rewrite all urls to /index.html)? `Yes`
   - File dist/index.html already exists. Overwrite? `No`
5. Generate an authentication token for GitHub Actions:
   ```bash
   firebase login:ci
   ```
6. Copy the generated token.
7. Go back to GitHub Secrets (from Step 4) and add one more secret:
   - `FIREBASE_TOKEN`: Paste the token here.

## Step 6 — Add Workflow Files
- Create the folder structure `.github/workflows/` manually in your project.
- **Stop here and ask the AI (me) for the GitHub Actions workflow files.** I will provide them ready for you to paste in.

## Step 7 — Deploy
Once the secrets are set and the workflow files are added, deployment is automatic!
1. Run these commands:
   ```bash
   git add .
   git commit -m "Add CI/CD configuration"
   git push origin main
   ```
2. Go to your GitHub repository and click the **Actions** tab to watch your code build and deploy automatically!
