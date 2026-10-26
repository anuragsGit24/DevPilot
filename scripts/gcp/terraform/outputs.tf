output "instance_connection_name" {
  description = "Connection string for Cloud SQL Proxy"
  value       = google_sql_database_instance.devpilot_instance.connection_name
}

output "public_ip_address" {
  description = "Public IP address of Cloud SQL instance"
  value       = google_sql_database_instance.devpilot_instance.public_ip_address
}

output "database_name" {
  value = google_sql_database.devpilot_db.name
}

output "database_user" {
  value = google_sql_user.devpilot_user.name
}

output "database_password" {
  value     = random_password.db_password.result
  sensitive = true
}

output "database_url_proxy" {
  description = "AsyncPG database URL via Cloud SQL Proxy"
  value       = "postgresql+asyncpg://${google_sql_user.devpilot_user.name}:${random_password.db_password.result}@127.0.0.1:5432/${google_sql_database.devpilot_db.name}"
  sensitive   = true
}
