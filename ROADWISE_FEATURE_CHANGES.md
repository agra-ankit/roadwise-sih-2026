# RoadWise Feature Changes

## Feature
Smart Duplicate Issue Detection & Report Clustering

## Status
Implementation not started

## Baseline
The original RoadWise system was verified as working before starting this feature. The baseline system allows citizens to submit road damage reports with images and coordinates, processes images via the YOLO AI service, stores individual reports in MongoDB, and displays report locations on an interactive admin map.

## Original Architecture

Frontend
→ Node/Express
→ FastAPI/YOLO
→ MongoDB
→ Map

## Feature Goal
Multiple citizen reports representing the same real-world road problem should be grouped under one Issue while preserving every individual Report. This prevents duplicate ticket creation for the same physical road damage, consolidates severity and priority scoring, and streamlines administration while maintaining full auditability of every citizen submission.

## Important Terminology
- **Report**: Individual citizen submission containing an uploaded image, location coordinates (GeoJSON Point), AI damage detection result, severity, and description.
- **Issue**: Real-world road problem represented by one or more Reports. Aggregates multiple citizen reports clustered by geographical proximity and damage similarity.

## Baseline Files
- **Report Model**: [backend/models/report.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/report.model.js) (Mongoose schema for citizen report submissions)
- **Report Controller**: [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js) (Handles report creation, file upload, AI service forwarding, and report fetching)
- **Report Routes**: [backend/routes/report.routes.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/routes/report.routes.js) (Express router with multer memory storage for `POST /api/reports` and `GET /api/reports`)
- **Frontend Map**: [frontend/src/pages/admin/Map.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Map.jsx) (Interactive Leaflet map component fetching and rendering report locations)
- **API Communication**: [frontend/src/services/api.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/services/api.js) (Frontend service methods connecting React components to Express API endpoints)
- **Backend Server**: [backend/server.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/server.js) (Main Express server setup, database connection, static file hosting, and route mounts)

## Rollback Strategy
This feature will be implemented incrementally and must be removable without losing the original Report data. The database schema and controller logic will preserve individual Report records as source-of-truth documents. If clustering or Issue grouping logic needs to be disabled or rolled back, individual Reports remain intact and accessible via standard report endpoints.

## Step 0 Changes
No application functionality was changed.

## Step 0 Verification
- Codebase structure inspected: Frontend (Vite/React), Express Backend, FastAPI AI service (YOLO), and MongoDB Mongoose schemas verified.
- Git repository baseline state checked: Baseline commit prepared with clean status before adding feature code.
- Automated tests: NOT TESTED (No pre-existing automated test suite configured in baseline).
- Application code modifications: None made in Step 0.
