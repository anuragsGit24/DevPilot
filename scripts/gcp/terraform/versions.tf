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

  # Supply the bucket during `terraform init`:
  # terraform init \
  #   -backend-config="bucket=<project>-tfstate" \
  #   -backend-config="prefix=devpilot"
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}
