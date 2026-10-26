#!/usr/bin/env bash
# ==============================================================================
# DevPilot GCP Cloud SQL Automated Setup (Optimized for $300 Free Credits)
# ==============================================================================
set -euo pipefail

echo "================================================================="
echo "  DevPilot GCP Cloud SQL Provisioning Script"
echo "  Targeting Free Tier / $300 Credits Budget"
echo "================================================================="

# Variables (configurable via environment)
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${GCP_REGION:-us-central1}"
INSTANCE_NAME="${CLOUD_SQL_INSTANCE:-devpilot-db}"
DATABASE_NAME="${CLOUD_SQL_DB:-devpilot}"
DB_USER="${CLOUD_SQL_USER:-devpilot}"
DB_PASSWORD="${CLOUD_SQL_PASSWORD:-$(openssl rand -base64 16)}"
SA_NAME="devpilot-cloudsql-sa"

echo "Using GCP Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Instance Name: $INSTANCE_NAME"
echo "Database: $DATABASE_NAME"
echo "User: $DB_USER"

# 1. Enable required APIs
echo "[1/6] Enabling Cloud SQL Admin API..."
gcloud services enable sqladmin.googleapis.com --project="$PROJECT_ID"

# 2. Create Cloud SQL Instance (PostgreSQL 16)
# Cost Optimization for $300 Free Credits:
# - Custom 1 vCPU, 3.75GB RAM (or shared db-f1-micro)
# - Zonal availability (no multi-zone replication charges)
# - 10GB SSD with auto-resize enabled
echo "[2/6] Provisioning Cloud SQL PostgreSQL 16 instance..."
if ! gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql instances create "$INSTANCE_NAME" \
        --project="$PROJECT_ID" \
        --database-version="POSTGRES_16" \
        --tier="db-custom-1-3840" \
        --region="$REGION" \
        --storage-type="SSD" \
        --storage-size="10GB" \
        --storage-auto-increase \
        --availability-type="ZONAL" \
        --backup-start-time="02:00" \
        --retained-backups-count=7 \
        --database-flags="cloudsql.enable_pgaudit=on"
    echo "Cloud SQL instance created successfully."
else
    echo "Cloud SQL instance $INSTANCE_NAME already exists. Skipping creation."
fi

# 3. Create the Database
echo "[3/6] Creating database '$DATABASE_NAME'..."
if ! gcloud sql databases describe "$DATABASE_NAME" --instance="$INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql databases create "$DATABASE_NAME" --instance="$INSTANCE_NAME" --project="$PROJECT_ID"
fi

# 4. Create the User
echo "[4/6] Creating application database user '$DB_USER'..."
if ! gcloud sql users list --instance="$INSTANCE_NAME" --project="$PROJECT_ID" | grep -q "$DB_USER"; then
    gcloud sql users create "$DB_USER" \
        --instance="$INSTANCE_NAME" \
        --password="$DB_PASSWORD" \
        --project="$PROJECT_ID"
fi

# 5. Create Service Account and IAM Role for Cloud SQL Proxy
echo "[5/6] Creating Service Account for Cloud SQL Proxy..."
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="DevPilot Cloud SQL Proxy SA" \
        --project="$PROJECT_ID"
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="roles/cloudsql.client"
fi

# 6. Generate Service Account Key
echo "[6/6] Generating service account key file (service_account.json)..."
KEY_FILE="service_account.json"
if [ ! -f "$KEY_FILE" ]; then
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="$SA_EMAIL" \
        --project="$PROJECT_ID"
    echo "Saved credentials to $KEY_FILE"
fi

echo "================================================================="
echo "  GCP Cloud SQL Provisioning Complete!"
echo "================================================================="
echo "Connection Name: ${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
echo "Database User:   ${DB_USER}"
echo "Database Pass:   ${DB_PASSWORD}"
echo "Database Name:   ${DATABASE_NAME}"
echo ""
echo "Next step: Run Alembic migrations against GCP:"
echo "  python scripts/gcp/migrate_and_seed_gcp.py"
echo "Or start with Docker Compose GCP:"
echo "  docker compose -f docker-compose.gcp.yml up --build"
echo "================================================================="
