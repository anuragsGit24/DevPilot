variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region (e.g. us-central1, europe-west1)"
  type        = string
  default     = "us-central1"
}

variable "instance_name" {
  description = "Cloud SQL instance identifier"
  type        = string
  default     = "devpilot-db"
}

variable "database_name" {
  description = "Name of the Postgres database"
  type        = string
  default     = "devpilot"
}

variable "db_user" {
  description = "Database username"
  type        = string
  default     = "devpilot"
}

variable "tier" {
  description = "Cloud SQL machine tier (db-custom-1-3840 or db-f1-micro)"
  type        = string
  default     = "db-custom-1-3840"
}
