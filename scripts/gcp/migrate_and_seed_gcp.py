"""
DevPilot GCP Database Migration & Seeding Script
Connects to GCP Cloud SQL, runs Alembic migrations, and seeds enterprise personas.
"""
import asyncio
import os
import subprocess
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import User, UserRole


async def test_and_migrate():
    settings = get_settings()
    db_url = os.environ.get("DEVPILOT_DATABASE_URL", settings.database_url)
    
    print("=" * 60)
    print("DevPilot GCP Cloud SQL Migration Runner")
    print("=" * 60)
    # Mask password in URL for secure output
    safe_url = db_url
    if "@" in safe_url and ":" in safe_url.split("@")[0]:
        user_part = safe_url.split("@")[0]
        host_part = safe_url.split("@")[1]
        protocol_user = user_part.rsplit(":", 1)[0]
        safe_url = f"{protocol_user}:******@{host_part}"
    print(f"Connecting to: {safe_url}")

    # 1. Test raw database connectivity
    print("\n[1/3] Testing GCP Cloud SQL Database Connectivity...")
    try:
        engine = create_async_engine(db_url, echo=False)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version_row = result.fetchone()
            print(f" Connected successfully!")
            print(f" Database Engine: {version_row[0]}")
    except Exception as e:
        print(f" Error connecting to GCP Cloud SQL: {e}")
        print("\nTroubleshooting Tips:")
        print("1. If using Cloud SQL Proxy, ensure it is running: ./cloud-sql-proxy <INSTANCE_NAME>")
        print("2. Ensure username, password, and port 5432 match your GCP configuration.")
        print("3. Check service_account.json has 'roles/cloudsql.client' IAM permission.")
        sys.exit(1)

    # 2. Run Alembic Migrations
    print("\n[2/3] Executing Alembic Migrations (0001_foundation, 0002_real_auth_and_audit)...")
    try:
        subprocess.run(["alembic", "upgrade", "head"], cwd=backend_dir, check=True)
        print(" Alembic migrations applied successfully!")
    except Exception as e:
        print(f" Migration failed: {e}")
        sys.exit(1)

    # 3. Seed Initial Enterprise Personas with Bcrypt Hashes
    print("\n[3/3] Verifying and Seeding Enterprise Personas (Admin, PM, BA, Dev, QA)...")
    SessionFactory = async_sessionmaker(engine, expire_on_commit=False)
    
    seed_personas = [
        {"name": "Eleanor Vance", "email": "admin@devpilot.demo", "role": UserRole.admin, "password": "AdminPassword123!"},
        {"name": "James Whitfield", "email": "pm@devpilot.demo", "role": UserRole.project_manager, "password": "Password123!"},
        {"name": "Sarah Chen", "email": "ba@devpilot.demo", "role": UserRole.business_analyst, "password": "Password123!"},
        {"name": "Marcus Rodriguez", "email": "dev@devpilot.demo", "role": UserRole.developer, "password": "Password123!"},
        {"name": "Priya Sharma", "email": "qa@devpilot.demo", "role": UserRole.tester, "password": "Password123!"},
    ]

    async with SessionFactory() as session:
        for persona in seed_personas:
            res = await session.execute(select(User).where(User.email == persona["email"]))
            existing = res.scalar_one_or_none()
            if not existing:
                new_user = User(
                    id=uuid.uuid4(),
                    email=persona["email"],
                    name=persona["name"],
                    role=persona["role"],
                    password_hash=hash_password(persona["password"]),
                    is_active=True,
                )
                session.add(new_user)
                print(f"  + Provisioned persona: {persona['name']} ({persona['email']}) -> {persona['role'].value}")
            else:
                print(f"  . Persona exists: {persona['name']} ({persona['email']})")
        await session.commit()

    await engine.dispose()
    print("\n GCP Cloud SQL Migration and Enterprise Seeding Completed Successfully!")


if __name__ == "__main__":
    asyncio.run(test_and_migrate())
