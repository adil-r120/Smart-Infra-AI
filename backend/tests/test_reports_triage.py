import os
import io
import cv2
import numpy as np
import pytest

def test_report_fake_image_rejection(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Create blank fake white image (0 potholes)
    blank = np.ones((300, 300, 3), dtype=np.uint8) * 255
    _, enc = cv2.imencode(".jpg", blank)
    
    files = {"image": ("fake_upload.jpg", enc.tobytes(), "image/jpeg")}
    data = {
        "report_type": "pothole",
        "description": "This is a fake test report with no defect",
        "location": "Indiranagar 100ft Road",
        "priority_level": "Medium"
    }

    res = client.post("/report", headers=headers, data=data, files=files)
    assert res.status_code == 400
    assert "AI Verification Failed" in res.json()["detail"]

def test_report_real_pothole_acceptance(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Find a real sample pothole image from uploads or create one with dark contour
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_path = os.path.join(backend_dir, "uploads", "report_20261025_185316_pothole.jpg")
    
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            img_bytes = f.read()
    else:
        # Fallback test image
        img_bytes = b"fake"

    if os.path.exists(sample_path):
        files = {"image": ("real_pothole.jpg", img_bytes, "image/jpeg")}
        data = {
            "report_type": "pothole",
            "description": "Severe deep pothole causing traffic slowdown",
            "location": "Koramangala 80ft Road",
            "priority_level": "Medium"
        }
        res = client.post("/report", headers=headers, data=data, files=files)
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert "id" in res.json()
        assert "Pothole" in res.json()["detected_issue"]

def test_reports_access_isolation(client, user_token, admin_token, db_session, test_user):
    from models import Report
    
    # Create report owned by test_user
    rep = Report(
        problem_type="pothole",
        description="User report test",
        location="MG Road",
        status="Pending",
        user_id=test_user.id
    )
    db_session.add(rep)
    db_session.commit()

    # Citizen sees their own report
    res_user = client.get("/reports", headers={"Authorization": f"Bearer {user_token}"})
    assert res_user.status_code == 200
    assert any(r["id"] == rep.id for r in res_user.json())

    # Admin sees all reports
    res_admin = client.get("/reports", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert any(r["id"] == rep.id for r in res_admin.json())

