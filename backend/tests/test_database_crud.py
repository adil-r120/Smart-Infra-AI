import pytest
from datetime import datetime
from models import Detection, Report, WorkOrder, Notification, User

def test_detections_crud(client, user_token, test_user, db_session):
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # 1. Create a detection via API or directly in DB
    detection = Detection(
        latitude=12.9716,
        longitude=77.5946,
        confidence=0.88,
        object_type="pothole",
        camera_id="CAM_TEST_01",
        is_danger=1,
        user_id=test_user.id
    )
    db_session.add(detection)
    db_session.commit()
    db_session.refresh(detection)
    assert detection.id is not None

    # 2. Read via /map-data
    res = client.get("/map-data", headers=headers)
    assert res.status_code == 200
    map_points = res.json()
    assert any(p["id"] == detection.id for p in map_points)

    # 3. Read single detection via /detections/{id}
    res_single = client.get(f"/detections/{detection.id}", headers=headers)
    assert res_single.status_code == 200
    assert res_single.json()["object_type"] == "pothole"

    # 4. Stats calculation verification
    res_stats = client.get("/stats", headers=headers)
    assert res_stats.status_code == 200
    assert res_stats.json()["total_potholes"] >= 1

def test_work_order_workflow(client, admin_token, test_admin, test_user, db_session):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a detection
    detection = Detection(
        latitude=13.0827,
        longitude=80.2707,
        confidence=0.91,
        object_type="pothole",
        camera_id="CAM_TEST_02",
        user_id=test_admin.id
    )
    db_session.add(detection)
    db_session.commit()

    # 2. Create work order
    wo_res = client.post("/work-orders", headers=admin_headers, json={
        "detection_id": detection.id,
        "assigned_user_id": test_user.id,
        "priority": "High",
        "notes": "Emergency repair needed on highway"
    })
    assert wo_res.status_code == 200
    wo_id = wo_res.json()["id"]

    # 3. List work orders
    list_res = client.get("/work-orders", headers=admin_headers)
    assert list_res.status_code == 200
    assert any(w["id"] == wo_id for w in list_res.json())

    # 4. Update work order status
    patch_res = client.patch(f"/work-orders/{wo_id}", headers=admin_headers, json={
        "status": "In Progress",
        "notes": "Crew dispatched to site"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "In Progress"

