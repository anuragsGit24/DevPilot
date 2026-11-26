project_id  = "devpilot-1"
region      = "us-central1"
github_repo = "anuragsGit24/DevPilot"

instance_name = "devpilot-db"
tier          = "db-f1-micro"

developer_members = ["user:heet.shah223@spit.ac.in"]
backend_image     = "us-central1-docker.pkg.dev/devpilot-1/devpilot/backend:initial"
# Names of extra secrets to create (values are added manually with gcloud).
# secret_ids = ["ANTHROPIC_API_KEY", "JWT_SECRET_KEY"]

# enable_vertex_ai    = true
# deletion_protection = true  
