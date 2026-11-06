# ---------------------------------------------------------------------------
# Runtime identity: what the running app (service + migration job) may do
# ---------------------------------------------------------------------------
resource "google_service_account" "runtime" {
  account_id   = "devpilot-runtime"
  display_name = "DevPilot Cloud Run runtime"

  depends_on = [google_project_service.apis]
}

locals {
  runtime_roles = toset(concat(
    [
      "roles/cloudsql.client",
      "roles/logging.logWriter",
      "roles/monitoring.metricWriter",
      "roles/cloudtrace.agent",
    ],
    var.enable_vertex_ai ? ["roles/aiplatform.user"] : []
  ))
}

resource "google_project_iam_member" "runtime" {
  for_each = local.runtime_roles
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.runtime.email}"
}

# Least privilege: access only to the specific secrets, not every secret in the project.
resource "google_secret_manager_secret_iam_member" "runtime_database_url" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_extra" {
  for_each  = toset(var.secret_ids)
  secret_id = google_secret_manager_secret.extra[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

# Developers run the Cloud SQL Auth Proxy with their own login
# (gcloud auth application-default login). No service-account key files.
resource "google_project_iam_member" "developers_cloudsql" {
  for_each = toset(var.developer_members)
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = each.value
}

# ---------------------------------------------------------------------------
# Deployer identity: what GitHub Actions may do
# ---------------------------------------------------------------------------
resource "google_service_account" "deployer" {
  account_id   = "github-deployer"
  display_name = "GitHub Actions deployer"

  depends_on = [google_project_service.apis]
}

resource "google_cloud_run_v2_service_iam_member" "deployer_service" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_cloud_run_v2_service_iam_member" "deployer_frontend_service" {
  name     = google_cloud_run_v2_service.frontend.name
  location = google_cloud_run_v2_service.frontend.location
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_cloud_run_v2_job_iam_member" "deployer_migration_job" {
  name     = google_cloud_run_v2_job.migrate.name
  location = google_cloud_run_v2_job.migrate.location
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_usage" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_artifact_registry_repository_iam_member" "deployer_push" {
  repository = google_artifact_registry_repository.images.name
  location   = google_artifact_registry_repository.images.location
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer.email}"
}

# Deploying a revision that runs as the runtime SA requires "act as" on it.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

# ---------------------------------------------------------------------------
# Workload Identity Federation: GitHub Actions -> deployer SA, with no stored keys
# ---------------------------------------------------------------------------
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions"

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Only this repo AND only the deploy branch can get deploy credentials, so a
  # modified workflow on a feature branch cannot deploy.
  attribute_condition = "assertion.repository == '${var.github_repo}' && assertion.ref == 'refs/heads/${var.deploy_branch}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_impersonates_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
