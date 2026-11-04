locals {
  apis = toset(concat(
    [
      "run.googleapis.com",
      "artifactregistry.googleapis.com",
      "secretmanager.googleapis.com",
      "sqladmin.googleapis.com",
      "iam.googleapis.com",
      "iamcredentials.googleapis.com",
      "sts.googleapis.com",
      "cloudresourcemanager.googleapis.com",
      "serviceusage.googleapis.com",
      "logging.googleapis.com",
      "monitoring.googleapis.com",
      "cloudtrace.googleapis.com",
    ],
    var.enable_vertex_ai ? ["aiplatform.googleapis.com"] : []
  ))

}

resource "google_project_service" "apis" {
  for_each           = local.apis
  service            = each.value
  disable_on_destroy = false
}

# ---------------------------------------------------------------------------
# Cloud SQL PostgreSQL 16
# (resource addresses kept from the original module so existing state still matches)
# ---------------------------------------------------------------------------
resource "random_password" "db_password" {
  length  = 20
  special = false
}

resource "google_sql_database_instance" "devpilot_instance" {
  name             = var.instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier                        = var.tier
    edition                     = "ENTERPRISE"
    availability_type           = "ZONAL"
    disk_type                   = "PD_SSD"
    disk_size                   = 10
    disk_autoresize             = true
    deletion_protection_enabled = var.deletion_protection

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
      }
    }

    database_flags {
      name  = "cloudsql.enable_pgaudit"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled = true
      # Cloud Run connects through the Cloud SQL connector, which is always encrypted.
      # This rejects any other plaintext connection to the public IP.
      ssl_mode = "ENCRYPTED_ONLY"
    }
  }

  deletion_protection = var.deletion_protection

  depends_on = [google_project_service.apis]
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

# ---------------------------------------------------------------------------
# Artifact Registry
# ---------------------------------------------------------------------------
resource "google_artifact_registry_repository" "images" {
  repository_id = var.artifact_repository_id
  location      = var.region
  format        = "DOCKER"
  description   = "DevPilot container images"

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# Secret Manager
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "database_url" {
  secret_id = "DATABASE_URL"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "${var.db_url_scheme}://${google_sql_user.devpilot_user.name}:${random_password.db_password.result}@/${google_sql_database.devpilot_db.name}?host=/cloudsql/${google_sql_database_instance.devpilot_instance.connection_name}"
}

# Empty containers for API keys etc. Add values:
#   printf '%s' 'KEY' | gcloud secrets versions add NAME --data-file=-
resource "google_secret_manager_secret" "extra" {
  for_each  = toset(var.secret_ids)
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# Cloud Run: backend service
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "backend" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.devpilot_instance.connection_name]
      }
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = var.backend_env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  # The deploy workflow changes the image and shifts traffic; don't let `terraform apply` undo that.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].revision,
      client,
      client_version,
      traffic,
    ]
  }

  depends_on = [
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_iam_member.runtime_database_url,
    google_project_iam_member.runtime,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.allow_unauthenticated ? 1 : 0
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# Cloud Run: migration job (alembic upgrade head)
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_job" "migrate" {
  name     = var.migration_job_name
  location = var.region

  template {
    template {
      service_account = google_service_account.runtime.email
      max_retries     = 0
      timeout         = "600s"

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.devpilot_instance.connection_name]
        }
      }

      containers {
        image   = var.backend_image
        command = var.migration_command
        args    = var.migration_args

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url.secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_iam_member.runtime_database_url,
    google_project_iam_member.runtime,
  ]
}
