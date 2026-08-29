import io
from fastapi import FastAPI, File, UploadFile
from PIL import Image
import numpy as np
from ultralytics import YOLO
from pathlib import Path

app = FastAPI(title="Road Damage Detection API")

# Load YOLO model
CURRENT_DIR = Path(__file__).resolve().parent
MODEL_PATH = CURRENT_DIR / "models" / "best.pt"

model = YOLO(str(MODEL_PATH))
#model = YOLO("best.pt")

# Map YOLO class indices to clean string names
CLASS_NAMES = {
    0: "pothole",
    1: "open_manhole"
}

def estimate_severity(box_xyxy, img_width, img_height, class_name):
    """
    Rule-based visual severity estimation using relative bounding box area.
    Open manholes inherently start at medium/high due to immediate hazard risk.
    """
    x1, y1, x2, y2 = box_xyxy
    box_area = max(0, (x2 - x1)) * max(0, (y2 - y1))
    total_area = img_width * img_height

    if total_area == 0:
        return "low"

    area_ratio = (box_area / total_area) * 100

    if class_name == "open_manhole":
        # Open manholes pose severe immediate danger even if moderate in size
        return "high" if area_ratio > 3.0 else "medium"

    # For potholes:
    if area_ratio < 2.5:
        return "low"
    elif area_ratio < 7.0:
        return "medium"
    else:
        return "high"

def calculate_priority_score(damage_type, severity, confidence):
    """
    Calculates an operational priority score between 0 and 100.
    Combines hazard type, severity weight, and detection confidence.
    """
    base_scores = {
        "open_manhole": 50,
        "pothole": 30
    }
    
    severity_multipliers = {
        "low": 15,
        "medium": 30,
        "high": 45
    }

    base = base_scores.get(damage_type, 20)
    sev = severity_multipliers.get(severity, 15)
    conf_boost = confidence * 5.0  # Max +5 points for high confidence

    raw_score = base + sev + conf_boost
    return int(min(100, max(0, round(raw_score))))

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read and open image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    img_width, img_height = image.size

    # Run YOLO inference
    results = model(image, conf=0.35)
    result = results[0]

    # Road Scene & Skin Analysis (Used only to prevent close-up portrait false positives on open_manholes)
    np_img = np.array(image)
    r = np_img[:, :, 0].astype(int)
    g = np_img[:, :, 1].astype(int)
    b = np_img[:, :, 2].astype(int)

    # Human skin tone detector (R > 95, G > 40, B > 20, R > G > B, (R-G) > 15, (R-B) > 15)
    skin_mask = (r > 95) & (g > 40) & (b > 20) & ((r - g) > 15) & (r > b) & ((r - b) > 15)
    skin_ratio = float((np.sum(skin_mask) / (img_width * img_height)) * 100)

    detections = []
    
    if len(result.boxes) > 0:
        # Collect detections
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            class_name = CLASS_NAMES.get(cls_id, "other")
            conf = float(box.conf[0].item())
            xyxy = [round(coord, 2) for coord in box.xyxy[0].tolist()]

            box_severity = estimate_severity(xyxy, img_width, img_height, class_name)

            detections.append({
                "class": class_name,
                "confidence": round(conf, 4),
                "severity": box_severity,
                "bbox": xyxy
            })

        # Sort detections by confidence (primary detection is highest confidence)
        detections.sort(key=lambda d: d["confidence"], reverse=True)
        primary = detections[0]

        top_damage_type = primary["class"]
        top_confidence = primary["confidence"]
        top_severity = primary["severity"]

        # If YOLO flagged open_manhole on a close-up human selfie portrait (skin > 15%), reject false positive
        if top_damage_type == "open_manhole" and skin_ratio > 15.0:
            return {
                "filename": file.filename,
                "damage_detected": False,
                "damage_type": "other",
                "severity": None,
                "confidence": 0.0,
                "priority_score": 0,
                "detections": [],
                "rejection_reason": "Human portrait / non-road photo detected. Please photograph the road surface.",
                "skin_pct": round(skin_ratio, 1),
            }

        priority_score = calculate_priority_score(top_damage_type, top_severity, top_confidence)

        return {
            "filename": file.filename,
            "damage_detected": True,
            "damage_type": top_damage_type,
            "severity": top_severity,
            "confidence": top_confidence,
            "priority_score": priority_score,
            "detections": detections,
            "skin_pct": round(skin_ratio, 1),
        }
    else:
        return {
            "filename": file.filename,
            "damage_detected": False,
            "damage_type": "other",
            "severity": None,
            "confidence": 0.0,
            "priority_score": 0,
            "detections": [],
            "rejection_reason": "No road damage or pothole detected in image",
            "skin_pct": round(skin_ratio, 1),
        }