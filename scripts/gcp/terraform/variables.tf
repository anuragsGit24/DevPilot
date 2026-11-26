# ---------- core ----------
variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region for Cloud SQL, Cloud Run and Artifact Registry."
  type        = string
  default     = "us-central1"
}

variable "github_repo" {
  description = "GitHub repository allowed to deploy, as owner/name (case-sensitive)."
  type        = string
  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repo))
    error_message = "github_repo must look like owner/name."
  }
}

variable "deploy_branch" {
  description = "Only this branch may obtain deploy credentials."
  type        = string
  default     = "main"
}

# ---------- Cloud SQL ----------
# NOTE: instance_name must match an existing instance, or Terraform will create a new one.
variable "instance_name" {
  type    = string
  default = "devpilot-db"
}

variable "tier" {
  description = "db-f1-micro (cheapest) or db-custom-1-3840."
  type        = string
  default     = "db-f1-micro"
}

variable "database_name" {
  type    = string
  default = "devpilot"
}

variable "db_user" {
  type    = string
  default = "devpilot"
}

variable "db_url_scheme" {
  description = "SQLAlchemy driver scheme used to build DATABASE_URL."
  type        = string
  default     = "postgresql+asyncpg"
}

variable "deletion_protection" {
  description = "Protect Cloud SQL / Cloud Run from terraform destroy. Set true before real data."
  type        = bool
  default     = false
}

# ---------- Cloud Run / registry ----------
variable "artifact_repository_id" {
  type    = string
  default = "devpilot"
}

variable "backend_image" {
  description = "Fully qualified backend image in Artifact Registry. Push it before the first terraform apply."
  type        = string
  validation {
    condition     = can(regex("^.+-docker\\.pkg\\.dev/.+/.+:.+$", var.backend_image))
    error_message = "backend_image must be a tagged Artifact Registry image, for example REGION-docker.pkg.dev/PROJECT/REPOSITORY/backend:TAG."
  }
}

variable "frontend_image" {
  description = "Initial frontend image for Cloud Run. The deploy workflow replaces it with the built image."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "service_name" {
  type    = string
  default = "devpilot-backend"
}

variable "frontend_service_name" {
  type    = string
  default = "devpilot-frontend"
}

variable "frontend_origin_aliases" {
  description = "Additional frontend origins allowed by backend CORS, for example an existing Cloud Run URL alias."
  type        = list(string)
  default     = []
}

variable "migration_job_name" {
  type    = string
  default = "devpilot-migrate"
}

variable "migration_command" {
  type    = list(string)
  default = ["alembic"]
}

variable "migration_args" {
  type    = list(string)
  default = ["upgrade", "head"]
}

variable "max_instances" {
  type    = number
  default = 5
}

variable "allow_unauthenticated" {
  description = "Public API (the app does its own JWT auth). The deploy smoke test assumes this is true."
  type        = bool
  default     = true
}

variable "backend_env" {
  description = "Plain (non-secret) environment variables for the backend, e.g. { LOG_LEVEL = \"INFO\" }."
  type        = map(string)
  default     = {}
}

# ---------- secrets / access ----------
variable "secret_ids" {
  description = "Extra Secret Manager secrets to create (empty containers) and grant the runtime SA. Add values with gcloud, then attach to Cloud Run."
  type        = list(string)
  default     = []
}

variable "developer_members" {
  description = "IAM members allowed to use the Cloud SQL Auth Proxy locally, e.g. [\"user:you@gmail.com\"]."
  type        = list(string)
  default     = []
}

variable "enable_vertex_ai" {
  description = "Grant the runtime SA Vertex AI access (if the LLM adapter uses Gemini on Vertex)."
  type        = bool
  default     = false
}
