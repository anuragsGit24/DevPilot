output "github_actions_variables" {
  description = "Paste these into GitHub: Settings > Secrets and variables > Actions > Variables."
  value = {
    GCP_PROJECT_ID    = var.project_id
    GCP_REGION        = var.region
    GCP_WIF_PROVIDER  = google_iam_workload_identity_pool_provider.github.name
    GCP_DEPLOY_SA     = google_service_account.deployer.email
    AR_REPOSITORY     = google_artifact_registry_repository.images.repository_id
    CLOUD_RUN_SERVICE = google_cloud_run_v2_service.backend.name
    MIGRATION_JOB     = google_cloud_run_v2_job.migrate.name
    FRONTEND_SERVICE  = google_cloud_run_v2_service.frontend.name
  }
}

output "service_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}

output "cloud_sql_connection_name" {
  description = "Use with the Cloud SQL Auth Proxy: cloud-sql-proxy <this value>"
  value       = google_sql_database_instance.devpilot_instance.connection_name
}

output "runtime_service_account" {
  value = google_service_account.runtime.email
}

output "terraform_state_requirement" {
  description = "Terraform state contains database credentials and must use the secured GCS backend."
  value       = "Use terraform init -backend-config=\"bucket=<project>-tfstate\" -backend-config=\"prefix=devpilot\""
}
