import os
import cv2
import numpy as np
import pytest
from main import get_yolo_models, redact_sensitive_info

def test_yolo_models_loaded():
    pothole_m, general_m, multi_m = get_yolo_models()
    assert pothole_m is not None, "Pothole YOLO model must be loaded"
    assert general_m is not None, "General YOLO model must be loaded"

def test_privacy_redaction_gaussian_blur():
    # Create test image with mock bounding box
    img = np.ones((200, 200, 3), dtype=np.uint8) * 128
    detections = [
        {"class": "person", "bbox": [20, 20, 80, 80], "confidence": 0.95}
    ]
    redacted_img, was_redacted = redact_sensitive_info(img, detections)
    assert was_redacted is True
    assert redacted_img.shape == (200, 200, 3)

def test_non_sensitive_not_redacted():
    img = np.ones((200, 200, 3), dtype=np.uint8) * 128
    detections = [
        {"class": "pothole", "bbox": [10, 10, 50, 50], "confidence": 0.85}
    ]
    redacted_img, was_redacted = redact_sensitive_info(img, detections)
    assert was_redacted is False

