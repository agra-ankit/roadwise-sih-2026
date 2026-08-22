
from fastapi import FastAPI

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