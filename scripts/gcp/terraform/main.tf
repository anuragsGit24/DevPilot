terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "random_password" "db_password" {
  length  = 20
  special = false
}

# Cloud SQL PostgreSQL 16 Instance (Optimized for $300 Credit Free Tier)
resource "google_sql_database_instance" "devpilot_instance" {
  name             = var.instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.tier # db-custom-1-3840 or db-f1-micro
    availability_type = "ZONAL"  # Zonal to minimize charges against free credits
    disk_type         = "PD_SSD"
    disk_size         = 10
    disk_autoresize   = true

    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }

    database_flags {
      name  = "cloudsql.enable_pgaudit"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled    = true
      require_ssl     = false # Enforced when connecting via Cloud SQL Proxy
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "devpilot_db" {
  name     = var.database_name
  instance = google_sql_database_instance.devpilot_instance.name
}

resource "google_sql_user" "devpilot_user" {
  name     = var.db_user
  instance = google_sql_database_instance.devpilot_instance.name
  password = random_password.db_password.result
}

# Service Account for Cloud SQL Proxy
resource "google_service_account" "proxy_sa" {
  account_id   = "devpilot-cloudsql-sa"
  display_name = "DevPilot Cloud SQL Auth Proxy SA"
}

resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.proxy_sa.email}"
}

resource "google_service_account_key" "proxy_key" {
  service_account_id = google_service_account.proxy_sa.name
}

resource "local_file" "service_account_json" {
  content  = base64decode(google_service_account_key.proxy_key.private_key)
  filename = "${path.module}/service_account.json"
}
