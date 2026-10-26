import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, PasswordResetToken, Project, ProjectMember, User, UserRole


@pytest.mark.asyncio
async def test_user_registration_and_password_hashing(async_client: AsyncClient, db_session: AsyncSession):
    """Test real user registration with bcrypt password hashing."""
    reg_data = {
        "name": "Alice Analyst",
        "email": "alice@devpilot.demo",
        "password": "SecurePassword123!",
        "role": "business_analyst",
    }
    response = await async_client.post("/api/v1/auth/register", json=reg_data)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "alice@devpilot.demo"
    assert body["name"] == "Alice Analyst"
    assert body["role"] == "business_analyst"

    # Verify password was hashed (never plaintext in DB)
    result = await db_session.execute(select(User).where(User.email == "alice@devpilot.demo"))
    user = result.scalar_one()
    assert user.password_hash != "SecurePassword123!"
    assert user.password_hash.startswith("$2b$") or user.password_hash.startswith("$2a$")

    # Duplicate registration fails
    dup_res = await async_client.post("/api/v1/auth/register", json=reg_data)
    assert dup_res.status_code == 409


@pytest.mark.asyncio
async def test_login_success_and_jwt_tokens(async_client: AsyncClient):
    """Test successful login returns access and refresh JWT tokens."""
    # Register
    await async_client.post("/api/v1/auth/register", json={
        "name": "Bob Builder",
        "email": "bob@devpilot.demo",
        "password": "Password123!",
        "role": "developer",
    })

    # Login
    login_res = await async_client.post("/api/v1/auth/login", json={
        "email": "bob@devpilot.demo",
        "password": "Password123!",
    })
    assert login_res.status_code == 200
    tokens = login_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

    # Call /me with bearer token
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me_res = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "bob@devpilot.demo"
    assert me_data["role"] == "developer"
    assert "artifacts:generate" in me_data["capabilities"]
    assert "users:manage" not in me_data["capabilities"]  # Developers cannot manage users


@pytest.mark.asyncio
async def test_failed_login_controls_and_account_lockout(async_client: AsyncClient, db_session: AsyncSession):
    """Test failed login tracking and automatic lockout after 5 consecutive failures."""
    await async_client.post("/api/v1/auth/register", json={
        "name": "Charlie Check",
        "email": "charlie@devpilot.demo",
        "password": "CorrectPassword123!",
        "role": "tester",
    })

    # 4 bad attempts
    for attempt in range(1, 5):
        res = await async_client.post("/api/v1/auth/login", json={
            "email": "charlie@devpilot.demo",
            "password": "WrongPassword!",
        })
        assert res.status_code == 401
        assert f"Attempt {attempt} of 5" in res.json()["error"]["message"]

    # 5th attempt triggers lockout
    lock_res = await async_client.post("/api/v1/auth/login", json={
        "email": "charlie@devpilot.demo",
        "password": "WrongPassword!",
    })
    assert lock_res.status_code == 403
    assert "Account locked" in lock_res.json()["error"]["message"]

    # Even with correct password, login is blocked while locked
    blocked_res = await async_client.post("/api/v1/auth/login", json={
        "email": "charlie@devpilot.demo",
        "password": "CorrectPassword123!",
    })
    assert blocked_res.status_code == 403
    assert "locked" in blocked_res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_password_reset_token_flow_and_single_use(async_client: AsyncClient, db_session: AsyncSession):
    """Test password reset token generation, single-use enforcement, and replay prevention."""
    await async_client.post("/api/v1/auth/register", json={
        "name": "Diana Prince",
        "email": "diana@devpilot.demo",
        "password": "OldPassword123!",
        "role": "business_analyst",
    })

    # Request reset token
    forgot_res = await async_client.post("/api/v1/auth/forgot-password", json={
        "email": "diana@devpilot.demo"
    })
    assert forgot_res.status_code == 200
    raw_token = forgot_res.json().get("reset_token")
    assert raw_token is not None

    # Reset password with valid token
    reset_res = await async_client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "BrandNewPassword456!",
    })
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "ok"

    # Replay attack: attempting to reuse the same token must fail
    replay_res = await async_client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "AnotherNewPassword789!",
    })
    assert replay_res.status_code == 400
    assert "invalid, expired, or has already been used" in replay_res.json()["error"]["message"]

    # Login with old password fails
    old_login = await async_client.post("/api/v1/auth/login", json={
        "email": "diana@devpilot.demo",
        "password": "OldPassword123!",
    })
    assert old_login.status_code == 401

    # Login with new password succeeds
    new_login = await async_client.post("/api/v1/auth/login", json={
        "email": "diana@devpilot.demo",
        "password": "BrandNewPassword456!",
    })
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_server_side_rbac_matrix_and_user_provisioning(async_client: AsyncClient):
    """Test server-side RBAC enforcement: Admin vs Developer permissions."""
    # 1. Register Admin user
    await async_client.post("/api/v1/auth/register", json={
        "name": "Root Admin",
        "email": "admin@devpilot.demo",
        "password": "AdminPassword123!",
        "role": "admin",
    })
    admin_login = await async_client.post("/api/v1/auth/login", json={
        "email": "admin@devpilot.demo",
        "password": "AdminPassword123!",
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Register Developer user
    await async_client.post("/api/v1/auth/register", json={
        "name": "Dev User",
        "email": "dev@devpilot.demo",
        "password": "DevPassword123!",
        "role": "developer",
    })
    dev_login = await async_client.post("/api/v1/auth/login", json={
        "email": "dev@devpilot.demo",
        "password": "DevPassword123!",
    })
    dev_token = dev_login.json()["access_token"]
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # 3. Developer attempts Admin-only endpoint (provisioning user) -> 403 Forbidden
    unauthorized_res = await async_client.post(
        "/api/v1/auth/provision",
        json={"name": "Hacker", "email": "hacker@devpilot.demo", "role": "admin"},
        headers=dev_headers,
    )
    assert unauthorized_res.status_code == 403

    # 4. Developer attempts to view audit logs -> 403 Forbidden
    audit_forbidden = await async_client.get("/api/v1/audit-logs", headers=dev_headers)
    assert audit_forbidden.status_code == 403

    # 5. Admin can provision user -> 201 Created
    provision_res = await async_client.post(
        "/api/v1/auth/provision",
        json={"name": "New PM", "email": "pm@devpilot.demo", "role": "project_manager"},
        headers=admin_headers,
    )
    assert provision_res.status_code == 201
    assert provision_res.json()["role"] == "project_manager"

    # 6. Admin can view audit logs -> 200 OK
    audit_res = await async_client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert "USER_PROVISIONED" in actions


@pytest.mark.asyncio
async def test_project_scoped_permissions_and_data_isolation(async_client: AsyncClient):
    """Test project-scoped permissions: users cannot access projects they are not members of."""
    # 1. Register PM 1
    await async_client.post("/api/v1/auth/register", json={
        "name": "PM One",
        "email": "pm1@devpilot.demo",
        "password": "Password123!",
        "role": "project_manager",
    })
    pm1_login = await async_client.post("/api/v1/auth/login", json={
        "email": "pm1@devpilot.demo",
        "password": "Password123!",
    })
    pm1_headers = {"Authorization": f"Bearer {pm1_login.json()['access_token']}"}

    # 2. Register PM 2
    await async_client.post("/api/v1/auth/register", json={
        "name": "PM Two",
        "email": "pm2@devpilot.demo",
        "password": "Password123!",
        "role": "project_manager",
    })
    pm2_login = await async_client.post("/api/v1/auth/login", json={
        "email": "pm2@devpilot.demo",
        "password": "Password123!",
    })
    pm2_headers = {"Authorization": f"Bearer {pm2_login.json()['access_token']}"}

    # PM 1 creates Project Alpha
    proj_res = await async_client.post(
        "/api/v1/projects",
        json={"name": "Project Alpha", "description": "Confidential Project Alpha"},
        headers=pm1_headers,
    )
    assert proj_res.status_code == 201
    alpha_id = proj_res.json()["id"]

    # PM 1 can view Project Alpha
    view_alpha = await async_client.get(f"/api/v1/projects/{alpha_id}", headers=pm1_headers)
    assert view_alpha.status_code == 200

    # PM 2 attempts to view Project Alpha -> 403 Forbidden (cross-project data leak prevention)
    pm2_view = await async_client.get(f"/api/v1/projects/{alpha_id}", headers=pm2_headers)
    assert pm2_view.status_code == 403
    assert "not assigned as a member" in pm2_view.json()["error"]["message"]

    # PM 2 lists projects -> Project Alpha is not in their list
    pm2_list = await async_client.get("/api/v1/projects", headers=pm2_headers)
    assert pm2_list.status_code == 200
    listed_ids = [p["id"] for p in pm2_list.json()]
    assert alpha_id not in listed_ids
