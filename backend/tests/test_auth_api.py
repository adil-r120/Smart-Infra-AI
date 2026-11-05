import pytest

def test_health_check(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "message" in res.json()

def test_login_invalid_password(client, test_user):
    res = client.post("/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword999!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

def test_login_nonexistent_user(client):
    res = client.post("/auth/login", json={
        "email": "does.not.exist@smartinfra.local",
        "password": "Password123!"
    })
    assert res.status_code == 401

def test_me_endpoint_authenticated(client, user_token, test_user):
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name
    assert data["is_admin"] is False

def test_me_endpoint_unauthenticated(client):
    res = client.get("/auth/me")
    assert res.status_code == 401

def test_admin_access_control(client, user_token, admin_token):
    # Regular user trying to access admin stats -> 403 Forbidden
    res_user = client.get("/admin/stats", headers={"Authorization": f"Bearer {user_token}"})
    assert res_user.status_code == 403

    # Admin accessing admin stats -> 200 OK
    res_admin = client.get("/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert "total" in res_admin.json()

