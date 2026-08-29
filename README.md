# RoadWise SIH 2026

Smart road damage reporting and management system.

## Tech Stack

- React
- Node.js
- Express
- MongoDB
- FastAPI
- YOLO
- Android

## Environment Setup

1. Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Configure environment variables in `backend/.env` (e.g. `MONGO_URI`, `PORT`, `AI_SERVICE_URL`).
3. Note: `.env` is intentionally ignored by Git and should not be committed.

## Getting Started

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### AI Service
```bash
cd ai
pip install -r requirements.txt
uvicorn main:app --reload
```