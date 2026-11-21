# ClearSpec AI - 1-Click Google Cloud Run Deployment Script
# Automatically ensures gcloud is in PATH, checks authentication, and deploys.

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ClearSpec AI - Google Cloud Run Production Deployment   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure gcloud is available in current PowerShell session
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    $sdkBin = "C:\Users\vraje\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"
    if (Test-Path $sdkBin) {
        $env:Path = "$sdkBin;" + $env:Path
        Write-Host "✓ Loaded Google Cloud SDK from $sdkBin into session PATH." -ForegroundColor Green
    } else {
        Write-Error "gcloud executable not found. Please install the Google Cloud SDK."
    }
}

# 2. Check Authentication
Write-Host "`n[Step 1/5] Checking Google Cloud Authentication..." -ForegroundColor Yellow
$authAccount = (gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null)
if (-not $authAccount) {
    Write-Host "No active Google Cloud account detected. Opening browser for login..." -ForegroundColor Yellow
    gcloud auth login
    $authAccount = (gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null)
}
Write-Host "✓ Authenticated as: $authAccount" -ForegroundColor Green

# 3. Project Selection
Write-Host "`n[Step 2/5] Selecting Google Cloud Project..." -ForegroundColor Yellow
$currentProj = (gcloud config get-value project 2>$null)
Write-Host "Available projects:" -ForegroundColor Cyan
gcloud projects list

if (-not $currentProj -or $currentProj -eq "(unset)") {
    $chosenProj = Read-Host "Enter your GCP Project ID from the list above"
    gcloud config set project $chosenProj
    $currentProj = $chosenProj
} else {
    Write-Host "Currently active project: $currentProj" -ForegroundColor Green
    $switch = Read-Host "Use project '$currentProj'? [Y/n]"
    if ($switch -and $switch.ToLower() -eq 'n') {
        $chosenProj = Read-Host "Enter your GCP Project ID"
        gcloud config set project $chosenProj
        $currentProj = $chosenProj
    }
}
Write-Host "✓ Active project set to: $currentProj" -ForegroundColor Green

# 4. Enable Services
Write-Host "`n[Step 3/5] Enabling Cloud Run, Cloud Build, and Artifact Registry APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
Write-Host "✓ Cloud services enabled." -ForegroundColor Green

# 5. Extract GEMINI_API_KEY from .env
Write-Host "`n[Step 4/5] Reading GEMINI_API_KEY from .env..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Write-Error ".env file not found in root directory!"
}
$apiKey = (Get-Content .env | Select-String '^GEMINI_API_KEY=').Line.Split('=', 2)[1].Trim().Trim('"').Trim("'")
if (-not $apiKey) {
    Write-Error "GEMINI_API_KEY is empty in .env!"
}
Write-Host "✓ GEMINI_API_KEY loaded securely (length: $($apiKey.Length))." -ForegroundColor Green

# 6. Deploy to Cloud Run
Write-Host "`n[Step 5/5] Deploying container to Cloud Run (region: asia-south1)..." -ForegroundColor Yellow
Write-Host "Cloud Build will package your unified FastAPI backend + compiled React frontend." -ForegroundColor Cyan

gcloud run deploy clearspec-ai `
  --source . `
  --region asia-south1 `
  --allow-unauthenticated `
  --memory 1Gi `
  --set-env-vars="CONFIDENCE_THRESHOLD=0.85,ENVIRONMENT=production,GEMINI_API_KEY=$apiKey"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✓ DEPLOYMENT COMPLETE! Open your Service URL above." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
