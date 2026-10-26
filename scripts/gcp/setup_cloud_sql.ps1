# ==============================================================================
# DevPilot GCP Cloud SQL Automated Setup (PowerShell - Windows)
# Optimized for $300 Free Credits Project
# ==============================================================================
param (
    [string]$ProjectId,
    [string]$Region = "us-central1",
    [string]$InstanceName = "devpilot-db",
    [string]$DatabaseName = "devpilot",
    [string]$DbUser = "devpilot",
    [string]$DbPassword
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  DevPilot GCP Cloud SQL Windows Setup Script" -ForegroundColor Cyan
Write-Host "  Targeting Free Tier / $300 Credits Budget" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

if (-not $ProjectId) {
    $ProjectId = (gcloud config get-value project 2>$null)
    if (-not $ProjectId) {
        Write-Error "GCP Project ID not provided and not set in gcloud config. Pass -ProjectId <ID>"
        exit 1
    }
}

if (-not $DbPassword) {
    $DbPassword = [System.Web.Security.Membership]::GeneratePassword(16, 2)
    if (-not $DbPassword) {
        $DbPassword = "DevPilotGcpPass" + (Get-Random -Minimum 1000 -Maximum 9999) + "!"
    }
}

Write-Host "Project ID:    $ProjectId"
Write-Host "Region:        $Region"
Write-Host "Instance:      $InstanceName"
Write-Host "Database:      $DatabaseName"
Write-Host "User:          $DbUser"

# 1. Enable SQL Admin API
Write-Host "[1/6] Enabling Cloud SQL Admin API..." -ForegroundColor Yellow
gcloud services enable sqladmin.googleapis.com --project="$ProjectId"

# 2. Create Instance
Write-Host "[2/6] Provisioning Cloud SQL PostgreSQL 16 instance..." -ForegroundColor Yellow
$instanceExists = gcloud sql instances describe "$InstanceName" --project="$ProjectId" 2>$null
if (-not $instanceExists) {
    gcloud sql instances create "$InstanceName" `
        --project="$ProjectId" `
        --database-version="POSTGRES_16" `
        --tier="db-custom-1-3840" `
        --region="$Region" `
        --storage-type="SSD" `
        --storage-size="10GB" `
        --storage-auto-increase `
        --availability-type="ZONAL"
    Write-Host "Cloud SQL instance created." -ForegroundColor Green
} else {
    Write-Host "Cloud SQL instance $InstanceName exists. Skipping creation." -ForegroundColor Green
}

# 3. Create Database
Write-Host "[3/6] Creating database '$DatabaseName'..." -ForegroundColor Yellow
$dbExists = gcloud sql databases describe "$DatabaseName" --instance="$InstanceName" --project="$ProjectId" 2>$null
if (-not $dbExists) {
    gcloud sql databases create "$DatabaseName" --instance="$InstanceName" --project="$ProjectId"
}

# 4. Create User
Write-Host "[4/6] Creating user '$DbUser'..." -ForegroundColor Yellow
gcloud sql users create "$DbUser" --instance="$InstanceName" --password="$DbPassword" --project="$ProjectId" 2>$null

# 5. Service Account
Write-Host "[5/6] Creating service account for Cloud SQL Proxy..." -ForegroundColor Yellow
$saName = "devpilot-cloudsql-sa"
$saEmail = "${saName}@${ProjectId}.iam.gserviceaccount.com"
gcloud iam service-accounts create "$saName" --display-name="DevPilot Cloud SQL Proxy SA" --project="$ProjectId" 2>$null
gcloud projects add-iam-policy-binding "$ProjectId" --member="serviceAccount:${saEmail}" --role="roles/cloudsql.client" | Out-Null

# 6. Service Account Key
Write-Host "[6/6] Generating key file service_account.json..." -ForegroundColor Yellow
if (-not (Test-Path "service_account.json")) {
    gcloud iam service-accounts keys create "service_account.json" --iam-account="$saEmail" --project="$ProjectId"
}

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  GCP Cloud SQL Ready!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Connection Name: $ProjectId`:$Region`:$InstanceName"
Write-Host "User:            $DbUser"
Write-Host "Password:        $DbPassword"
Write-Host "Database:        $DatabaseName"
Write-Host ""
Write-Host "Run migration:   python scripts/gcp/migrate_and_seed_gcp.py"
