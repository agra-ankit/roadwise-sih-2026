from fastapi import FastAPI, File, UploadFile

app = FastAPI(title="RoadWise AI API")


@app.get("/")
def home():
    return {
        "message": "RoadWise AI API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    return {
        "filename": file.filename,
        "damage_detected": True,
        "damage_type": "pothole",
        "severity": "high",
        "confidence": 0.85
    }
