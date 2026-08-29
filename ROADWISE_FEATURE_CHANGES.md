# RoadWise Feature Changes

## Feature
Smart Duplicate Issue Detection & Report Clustering

## Status
Step 2.4 complete (High-accuracy GPS options, `locationAccuracy` capturing, and backend persistence implemented)

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

## Step 1 — Issue Model

### Added
- `backend/models/issue.model.js`
- `2dsphere` geospatial index on `location` field in `issueSchema`

### Modified
- `ROADWISE_FEATURE_CHANGES.md`

### Removed
None

### Why
An **Issue** represents a unique physical road defect in the real world (e.g. a specific pothole at a given junction), whereas a **Report** represents an individual citizen's submission about a road defect. Separating the Issue entity from individual Reports allows multiple citizen submissions for the same physical road defect to be grouped together under one parent Issue. This prevents duplicated work orders and redundant administration while maintaining complete audit trails and individual evidence for every citizen submission.

### Data Relationship
- **One Issue → many Reports**: An Issue document contains an array of `reports` referencing individual `Report` `_id`s, alongside an aggregated `reportCount`. Each individual `Report` remains a standalone document in MongoDB.

### Rollback
Step 1 introduces only a new data model definition (`backend/models/issue.model.js`) without altering existing database schemas, models, controllers, or frontend components. To rollback Step 1:
1. Delete the newly created `backend/models/issue.model.js` file.
2. Remove any Mongoose collection created for `issues` if MongoDB created the index in a test instance.
3. No existing Report data or existing API routes will be impacted or lost.

## Step 2 — Smart Issue Grouping

### Status
Step 2 complete (Core Smart Issue Grouping logic implemented)

### Grouping Rule
A newly submitted citizen report belongs to an existing `Issue` document **if and only if**:
1. An existing `Issue` is located within **30 meters** ($\le 30\text{m}$) of the incoming report's location coordinates (`Issue.location` 2dsphere index).
2. The existing `Issue.damageType` matches the new report's `damageType` exactly (e.g. `pothole` === `pothole`).

If either condition is false (or if coordinates are missing/invalid), a new `Issue` document is automatically created.

### Report Preservation
No citizen report is ever deleted or modified in structure. Every citizen submission remains an individual `Report` document in MongoDB. Multiple reports for the same physical road defect (e.g. 5 submissions for the same pothole) produce **5 Reports** linked to **1 Issue**.

### Issue Creation & Attachment Flow
- **If matching Issue exists within 30m and same damageType:**
  - Save `Report` document to MongoDB.
  - Append `Report._id` to `Issue.reports` array.
  - Increment `Issue.reportCount` (`Issue.reports.length`).
  - Upgrade `Issue.severity` if the incoming report has a higher severity (`high > medium > low`).
  - Update `Issue.priorityScore` to keep the maximum priority score.
  - Update `Issue.updatedAt`.
  - Save updated `Issue` document to MongoDB.
- **If no matching Issue exists (or distance > 30m or different damageType):**
  - Save `Report` document to MongoDB.
  - Create new `Issue` document with `reports: [Report._id]`, `reportCount: 1`, `damageType`, `severity`, `priorityScore`, `location`, `status: "reported"`.
  - Save new `Issue` document to MongoDB.

### Error Handling & Safety
If any unexpected error occurs during the Issue grouping query or Issue save phase, the error is safely caught and logged. The citizen's `Report` remains safely stored in MongoDB, and the API request completes successfully without data loss.

### Old vs New Flow Comparison
- **Old Flow:** Citizen submits report → AI model detects damage → Report created and saved to MongoDB → Response returned (`{ message, report, ai_analysis }`).
- **New Flow:** Citizen submits report → AI model detects damage → Report created and saved to MongoDB → Spatial query searches for matching Issue within 30m and same `damageType` → Report attached to existing Issue or new Issue created → Response returned (`{ message, report, ai_analysis, issue }`).

### Files Modified in Step 2
- [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js) (Added Issue model require, spatial proximity query, issue attachment/creation logic, and fail-safe error handling)
- [ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md) (Documented Step 2 grouping rules, flow changes, and rollback instructions)

### Step 2 Rollback Procedure
To rollback Step 2 changes:
1. Revert [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js) to remove the `Issue` model require and the Smart Issue Grouping block in `createReport`.
2. Existing `Report` records in MongoDB remain completely unaffected as they were saved independently.
3. Any `Issue` documents created in MongoDB can either be retained for reference or dropped (`db.issues.drop()`).

## Step 2.1 — Geo-Spatial Index Initialization Fix

### Status
Step 2.1 complete (Issue 2dsphere index initialization guaranteed at application startup)

### Problem
Automated unit tests passed because test scripts explicitly invoked `await Issue.createIndexes()` prior to running `$near` geospatial queries. In the real application, `connectDB()` initiated MongoDB connection without explicitly waiting for index construction before the server started listening for HTTP requests (`app.listen()`). On real report submissions, `Issue.findOne({ location: { $near: ... } })` failed with a `MongoServerError: unable to find index for $geoNear query`, skipping Issue creation/attachment and returning `issue: null`.

### Root Cause
Missing guarantee that the `Issue` `2dsphere` index was fully created and ready in MongoDB before incoming HTTP requests arrived to create reports and query nearby issues.

### Fix
1. Updated [backend/config/db.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/config/db.js) to explicitly call `await Issue.createIndexes()` after MongoDB connection succeeds. If index initialization fails, the process exits with error (`process.exit(1)`).
2. Updated [backend/server.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/server.js) to wrap server startup in an async function (`startServer`) that awaits `connectDB()` before invoking `app.listen(PORT)`.

### Files Modified
- [backend/config/db.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/config/db.js) (Added `Issue` model require and explicit `await Issue.createIndexes()`)
- [backend/server.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/server.js) (Wrapped `app.listen()` in `startServer()` async function awaiting `connectDB()`)
- [ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md) (Documented Step 2.1 problem, root cause, fix, and verification)

### Files Added
- None

### Files Removed
- None

### Rollback
To rollback Step 2.1:
1. Revert [backend/config/db.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/config/db.js) to remove `Issue.createIndexes()`.
2. Revert [backend/server.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/server.js) to invoke `connectDB()` synchronously without `startServer()`.

### Verification
- MongoDB 2dsphere index creation test: 🟢 **PASSED**
- Express server startup test: 🟢 **PASSED**
- `POST /api/reports` creation test: 🟢 **PASSED**
- `$near` geospatial query execution test: 🟢 **PASSED**

## Step 2.3 — Historical Report Migration

### Status
Step 2.3 complete (Standalone historical report migration script with dry-run support implemented)

### Why Migration Was Necessary
Reports created prior to the introduction of Smart Issue Grouping (Steps 1–2) existed as standalone `Report` documents in MongoDB without associated `Issue` records. The migration tool converts unlinked historical citizen reports into real-world `Issue` clusters based on proximity and damage similarity.

### Migration Rules
- **Grouping Distance:** 30 meters maximum clustering radius ($\le 30\text{m}$).
- **Damage Type Matching:** Exact match on `damageType` (`Issue.damageType === Report.damageType`).
- **Severity Escalation:** Issue severity reflects highest attached report severity (`low < medium < high`).
- **Idempotency:** Safe to run multiple times. Reports already linked to an `Issue` (`Issue.findOne({ reports: report._id })`) are automatically skipped on subsequent runs.
- **Source Data Preservation:** 100% data integrity. Zero `Report` documents deleted or modified.

### Files Added / Modified in Step 2.3
- **[backend/scripts/migrateReportsToIssues.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/scripts/migrateReportsToIssues.js)** (NEW: Standalone CLI migration script supporting `--dry-run` and live migration modes)
- **[ROADWISE_MIGRATION_LOG.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_MIGRATION_LOG.md)** (NEW: Migration execution audit log file)
- **[ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md)** (MODIFIED: Documented Step 2.3 migration tool specification)

### How to Run Migration
- **Dry-Run Mode (Simulation only, ZERO DB writes):**
  `node backend/scripts/migrateReportsToIssues.js --dry-run`
- **Live Migration Mode:**
  `node backend/scripts/migrateReportsToIssues.js`

### Step 2.3 Rollback Procedure
To rollback Step 2.3:
1. Delete [backend/scripts/migrateReportsToIssues.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/scripts/migrateReportsToIssues.js) and [ROADWISE_MIGRATION_LOG.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_MIGRATION_LOG.md).
2. If migrated `Issue` records need to be removed, drop the `issues` collection (`db.issues.drop()`). All original `Report` documents remain 100% intact and unaffected.

## Step 2.4 — GPS Accuracy Improvement

### Status
Step 2.4 complete (High-accuracy GPS options, `locationAccuracy` capturing, and backend persistence implemented)

### Previous Behavior & Root Cause
In [frontend/src/components/citizen/ReportForm.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/components/citizen/ReportForm.jsx), `navigator.geolocation.getCurrentPosition` was invoked without an `options` argument. Browsers defaulted `enableHighAccuracy` to `false`, bypassing GPS hardware receivers and immediately returning coarse Wi-Fi / IP triangulation estimates. Coarse location estimates exhibit 30–100+ meter coordinate drift, causing sequential photos taken at the exact same physical pothole to be assigned different coordinates outside the 30-meter grouping threshold.

### Fix & New Options
1. Updated `navigator.geolocation.getCurrentPosition` in `ReportForm.jsx` to explicitly pass high-accuracy options:
   ```javascript
   {
     enableHighAccuracy: true, // Requests hardware GPS positioning
     timeout: 10000,           // 10 second maximum wait before timeout error
     maximumAge: 0             // Forces fresh position request (no cached location)
   }
   ```
2. Captured `position.coords.accuracy` (location uncertainty radius in meters) in `location` state object (`accuracy: position.coords.accuracy`).
3. Appended `locationAccuracy` to `FormData` when submitting reports to `POST /api/reports`.
4. Updated `Report` model ([backend/models/report.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/report.model.js)) and `Issue` model ([backend/models/issue.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/issue.model.js)) to store optional `locationAccuracy` (numeric value in meters).
5. Added UI loading state (`locating`) displaying *"Capturing GPS location..."* while awaiting hardware GPS lock.

### Preservation of Rules & Architecture
- **30m Grouping Radius Unchanged:** The 30-meter spatial proximity rule (`$maxDistance: 30`) remains 100% untouched.
- **GeoJSON Coordinate Order Unchanged:** GeoJSON `coordinates: [longitude, latitude]` order remains 100% untouched.
- **YOLO AI & FastAPI Unchanged:** Inference pipeline remains 100% untouched.
- **Note on Device GPS Dependency:** Hardware GPS accuracy depends on device sensors, clear sky line-of-sight, and operating system permissions. `enableHighAccuracy: true` requests the highest precision available on the client device.

### Files Modified in Step 2.4
- **[frontend/src/components/citizen/ReportForm.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/components/citizen/ReportForm.jsx)** (Added high accuracy options, locationAccuracy capturing, locating loading state, and FormData transmission)
- **[backend/models/report.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/report.model.js)** (Added `locationAccuracy` numeric field)
- **[backend/models/issue.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/issue.model.js)** (Added `locationAccuracy` numeric field)
- **[backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js)** (Parsed `locationAccuracy` from request body and persisted to Report and Issue documents)
- **[ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md)** (Updated with Step 2.4 specification)

### Step 2.4 Rollback Procedure
To rollback Step 2.4:
1. Revert [frontend/src/components/citizen/ReportForm.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/components/citizen/ReportForm.jsx) to remove `enableHighAccuracy` options and `locationAccuracy` FormData field.
2. Revert [backend/models/report.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/report.model.js) and [backend/models/issue.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/issue.model.js).
3. Revert [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js).

## Step 2.6 — GPS Accuracy Improvement & Strict Validation

### Status
Step 2.6 complete (Strict `locationAccuracy` validation, `min: 0` Mongoose constraints, and ReportDetails UI integration implemented)

### Previous Behavior
`position.coords.accuracy` was captured in state but backend parsing used unvalidated float conversion without explicit non-negative or finite number guarantees.

### New Behavior & Validation
1. **High Accuracy Geolocation Options:**
   - `enableHighAccuracy: true` (forces device GPS hardware lock)
   - `timeout: 10000` (10 second maximum wait)
   - `maximumAge: 0` (bypasses cached location data)
2. **Strict Backend Validation:**
   - [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js) validates `locationAccuracy`: rejects `NaN`, `Infinity`, negative numbers, and non-numeric strings (`if (!isNaN(parsedAcc) && isFinite(parsedAcc) && parsedAcc >= 0)`).
   - [backend/models/report.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/report.model.js) and [backend/models/issue.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/issue.model.js) enforce `min: 0` validation on `locationAccuracy`.
3. **Frontend UI Display:**
   - [frontend/src/pages/admin/ReportDetails.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/ReportDetails.jsx) displays `Location accuracy: ~8 m` when available, falling back gracefully to `Location accuracy: Not available` for older reports.

### Files Modified in Step 2.6
- [frontend/src/components/citizen/ReportForm.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/components/citizen/ReportForm.jsx)
- [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js)
- [backend/models/report.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/report.model.js)
- [backend/models/issue.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/issue.model.js)
- [frontend/src/pages/admin/ReportDetails.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/ReportDetails.jsx)
- [ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md)

### Rollback Procedure
To rollback Step 2.6:
1. Revert [frontend/src/pages/admin/ReportDetails.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/ReportDetails.jsx).
2. Remove `min: 0` from [backend/models/report.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/report.model.js) and [backend/models/issue.model.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/models/issue.model.js).

## Step 2.9 — Smart Interactive GPS Acquisition

### Status
Step 2.9 complete (Smart multi-reading GPS acquisition with early-success termination and watchPosition cleanup implemented)

### Previous Behavior
`ReportForm.jsx` invoked `navigator.geolocation.getCurrentPosition()` once, immediately accepting the single returned coordinate reading regardless of device sensor lock state.

### New Behavior & Logic
1. **Multi-Reading Acquisition via `watchPosition`:**
   - On pressing "Use my current location", `navigator.geolocation.watchPosition` collects continuous GPS stream readings.
   - Evaluates incoming reading accuracy against `currentBest` reading.
   - Collects up to 5 valid readings or up to a 10-second acquisition window (`setTimeout(..., 10000)`).
2. **Early Success Termination:**
   - If a high-precision reading ($\le 12$m accuracy) is acquired, acquisition terminates early without forcing the user to wait for the 10-second timeout window.
3. **Poor Accuracy Handling:**
   - If all readings have coarse accuracy (>30m), the best available reading is selected and a clear warning notification is rendered: *"Low GPS accuracy (~65m). Outdoor view recommended."*
4. **`watchPosition` Lifecycle Cleanup:**
   - Invokes `navigator.geolocation.clearWatch(watchId)` immediately upon completion, error, early-success, timeout, or component unmount (`useEffect` cleanup hook).
5. **Data State Integrity:**
   - Ensures ONLY the selected `bestReading` (`{ latitude, longitude, accuracy }`) is set into component state and appended to `FormData` (`latitude`, `longitude`, `locationAccuracy`).

### Preservation of Rules & Architecture
- **30m Grouping Radius Unchanged:** Spatial proximity threshold `$maxDistance: 30` remains 100% untouched.
- **Supporting-Report Grouping Unchanged:** Multi-report chain clustering logic remains 100% untouched.
- **Backend Schemas & AI Unchanged:** `Report` schema, `Issue` schema, and YOLO/FastAPI inference pipeline remain 100% untouched.

### Files Modified in Step 2.9
- **[frontend/src/components/citizen/ReportForm.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/components/citizen/ReportForm.jsx)** (Added `watchPosition` multi-reading acquisition, `useRef` watcher tracking, early-success logic, `useEffect` unmount cleanup, and interactive UI status updates)
- **[ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md)** (Updated with Step 2.9 specification)

### Step 2.9 Rollback Procedure
To rollback Step 2.9:
1. Revert [frontend/src/components/citizen/ReportForm.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/components/citizen/ReportForm.jsx) to the `getCurrentPosition` implementation from Step 2.6.
2. No backend, database, or API changes were made in Step 2.9.

## Step 7 — Admin Dashboard Total Issues Metric Card

### Status
Step 7 complete (Admin Dashboard updated with approved 5th stat card for Total Issues)

### Feature Added
Added a dedicated **Total Issues** statistic card to the Admin Dashboard ([frontend/src/pages/admin/Dashboard.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Dashboard.jsx)).

### Before Behavior
Dashboard displayed 4 statistic cards:
- Total Reports (citizen submissions)
- Pending
- High Priority
- Resolved

### After Behavior
Dashboard displays 5 statistic cards:
- **Total Reports:** Total individual citizen submissions fetched via `getReports()` (`GET /api/reports`).
- **Total Issues:** Total unique physical road defects fetched via `getIssues()` (`GET /api/issues`) with description *"Grouped road problems"*.
- **Pending:** Reports requiring attention.
- **High Priority:** Urgent response items.
- **Resolved:** Percentage of completed tickets.

### Why Total Reports and Total Issues Are Separate
- **Total Reports:** Represents individual citizen submissions (e.g. 14 reports), maintaining complete evidence and audit history for every citizen upload.
- **Total Issues:** Represents clustered real-world road defects (e.g. 4 grouped issues), preventing work order duplication.

### Files Modified & Temporary Files Removed
- **Modified:** [frontend/src/pages/admin/Dashboard.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Dashboard.jsx) (Added `getIssues()` integration and 5-column grid card layout)
- **Modified:** [ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md) (Documented Step 7 changes)
- **Removed:** `frontend/src/pages/admin/DashboardPreview.jsx` (Temporary preview component deleted after user approval)
- **Removed:** `/admin/dashboard-preview` route (Temporary route removed from `App.jsx`)

### Step 7 Rollback Procedure
To rollback Step 7:
1. Revert [frontend/src/pages/admin/Dashboard.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Dashboard.jsx) to fetch `getReports()` only and display 4 stat cards.

## Step 3 — Issue Aggregation Information

### Status
Step 3 complete (Severity hierarchy and safe reportCount aggregation implemented)

### Severity Aggregation Rule
When multiple citizen reports are attached to an `Issue`, the `Issue.severity` is dynamically updated to represent the **highest severity** among all linked reports, using the project's existing severity ordering (`low < medium < high`):
- `low` + `low` → `low`
- `low` + `medium` → `medium`
- `medium` + `high` → `high`
- `low` + `high` → `high`

### Report Count & Duplicate Prevention Behavior
- `Issue.reportCount` is set to `Issue.reports.length` after string-level duplicate ID checking (`existingReportIds.includes(reportIdStr)`).
- Double-submitting the same report ID or duplicate controller invocations will **not** double-count `reportCount` or duplicate entries in `Issue.reports`.
- Each original `Report.severity` remains 100% unchanged.

### Files Modified in Step 3
- [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js) (Refined Issue aggregation block with string-level duplicate ID checks and severity escalation)
- [ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md) (Updated status and documented Step 3 aggregation rules)

### Step 3 Rollback Procedure
To rollback Step 3 changes:
1. Revert [backend/controllers/report.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/report.controller.js) to the previous array push implementation.
2. All underlying `Report` records and `Issue` records remain intact.

### Step 3 Verification & Tests
1. **reportCount Progression Test:**
   - 1 report → `reportCount` = 1
   - 2 same issue reports → `reportCount` = 2
   - 3 same issue reports → `reportCount` = 3
   - Result: 🟢 **PASSED**
2. **Severity Hierarchy Test:**
   - `low` + `low` → `low`
   - `low` + `medium` → `medium`
   - `medium` + `high` → `high`
   - `low` + `high` → `high`
   - Result: 🟢 **PASSED**
3. **Report.severity Preservation Test:**
   - Attached `Report.severity` values remain `low` and `medium` while `Issue.severity` updates to `medium`.
   - Result: 🟢 **PASSED**
4. **Accidental Double-Counting Prevention Test:**
   - Duplicate submission of same Report ID keeps `reportCount` = 1 and `reports.length` = 1.
   - Result: 🟢 **PASSED**

## Step 4 — Issue Retrieval API

### Status
Step 4 complete (Issue REST API endpoints created)

### New Endpoints
- **`GET /api/issues`**: Fetches all grouped `Issue` records sorted by `updatedAt` desc, with populated `reports` array.
- **`GET /api/issues/:id`**: Fetches single `Issue` by ID with populated `reports` array.

### Response Structure
```json
[
  {
    "_id": "66ce3f8a001a2b3c4d5e6f7a",
    "damageType": "pothole",
    "severity": "high",
    "location": {
      "type": "Point",
      "coordinates": [80.9462, 26.8467],
      "address": "Lucknow Main Road"
    },
    "reports": [
      {
        "_id": "66ce3f8a001a2b3c4d5e6f7b",
        "imageUrl": "/uploads/report-1787843000-1234.jpg",
        "damageType": "pothole",
        "severity": "medium",
        "priorityScore": 50,
        "confidence": 0.92,
        "status": "reported",
        "description": "Pothole near crossroad",
        "createdAt": "2026-08-27T20:00:00.000Z"
      }
    ],
    "reportCount": 1,
    "priorityScore": 50,
    "status": "reported",
    "createdAt": "2026-08-27T20:00:00.000Z",
    "updatedAt": "2026-08-27T20:00:00.000Z"
  }
]
```

### Reason
Provides dedicated API endpoints for frontend components (such as maps, dashboards, and issue management screens) to fetch aggregated `Issue` data and associated citizen submissions without modifying or breaking existing `/api/reports` endpoints.

### Files Added / Modified in Step 4
- **[backend/controllers/issue.controller.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/controllers/issue.controller.js)** (NEW: Implements `getIssues` and `getIssueById` with population and error handling)
- **[backend/routes/issue.routes.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/routes/issue.routes.js)** (NEW: Defines Express router routes for `GET /api/issues` and `GET /api/issues/:id`)
- **[backend/server.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/backend/server.js)** (MODIFIED: Registered `issueRoutes` at `/api/issues`)
- **[frontend/src/services/api.js](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/services/api.js)** (MODIFIED: Exported `getIssues()` and `getIssueById(id)` frontend service functions)
- **[ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md)** (MODIFIED: Documented Step 4 API specifications)

### Step 4 Rollback Procedure
To rollback Step 4:
1. Remove `app.use("/api/issues", issueRoutes);` from `backend/server.js`.
2. Delete `backend/controllers/issue.controller.js` and `backend/routes/issue.routes.js`.
3. Revert `frontend/src/services/api.js` to remove `getIssues` and `getIssueById`.
4. Existing Report API (`/api/reports`) and Report database records remain 100% operational.

### Step 4 Verification & Testing
- Syntax checks (`node --check` on all backend files): 🟢 **PASSED**
- Frontend production build (`npm run build`): 🟢 **PASSED**
- Controller structure & error handling checks: 🟢 **PASSED**

## Step 5 — Frontend Grouped Issues Map

### Status
Step 5 complete (Admin Map updated to display grouped Issues as primary markers)

### Old Map Behavior
The admin map fetched individual reports via `getReports()` and rendered a distinct map marker for every single citizen submission. When multiple citizens submitted reports for the exact same pothole, duplicate markers overlaid on top of each other.

### New Map Behavior
- **Primary Markers:** Map markers now represent aggregated real-world **Issues** fetched via `getIssues()`.
- **Marker Styling & Badge:** Each marker displays a glowing color corresponding to the Issue's highest severity (`high` → red, `medium` → orange, `low` → cyan) and a report count badge (e.g. `2`, `3`) if multiple reports are attached.
- **Coordinate Conversion:** GeoJSON coordinates `[longitude, latitude]` are correctly converted to Leaflet's required `[latitude, longitude]` order (`lat = issue.location.coordinates[1]`, `lng = issue.location.coordinates[0]`).
- **Interactive Popup Information:**
  - Issue ID (e.g. `ISSUE-7A2B3C`)
  - Damage Type (e.g. `Pothole`)
  - Report Count Badge (`👥 2 Reports Attached`)
  - Highest Severity level
  - Priority Score out of 100
  - Coordinates & Address
  - **Supporting Citizen Reports List:** Scrollable list of attached individual citizen reports with direct "View →" link to individual report details page (`/admin/reports/:id`).
  - Google Maps direct link (`📍 Open in Google Maps ↗`).
- **Sidebar Integration:** The sidebar lists grouped Issues with address, ID, severity badge, report count badge, and a button to inspect linked reports.
- **Graceful Fallback:** If `getIssues()` returns no data, the map gracefully falls back to constructing fallback issue views from `getReports()`.

### UI Changes
- Updated [frontend/src/pages/admin/Map.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Map.jsx) to call `getIssues()` as primary data provider.
- Added report count badges on map markers for clustered issues.
- Added supporting citizen report list inside Leaflet map popups.

### Files Modified in Step 5
- **[frontend/src/pages/admin/Map.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Map.jsx)** (Updated map rendering to fetch and display grouped Issues as primary markers with supporting report inspection)
- **[ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md)** (Updated status and documented Step 5 frontend map changes)

### Step 5 Rollback Procedure
To rollback Step 5 changes:
1. Revert [frontend/src/pages/admin/Map.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Map.jsx) to fetch and render `getReports()` directly.
2. No backend models or API endpoints are modified by Step 5.

### Step 5 Build Result
- `npm run build` completed cleanly: `built in 365ms` (0 errors, `dist/assets/index-dqvcg0fC.js`).

## Step 6 — Issue Details Experience

### Status
Step 6 complete (Dedicated IssueDetails view, ROAD ISSUE summary layout, and supporting reports inspection implemented)

### Issue Details UI
When selecting an Issue, the system displays the structured **ROAD ISSUE** experience:
- **Damage Type:** e.g. `Pothole` / `Open Manhole`
- **Severity:** e.g. `High` / `Medium` / `Low` (styled with RoadWise dark-theme color indicators)
- **Reports:** Count of citizen submissions (e.g. `7`)
- **Status:** Issue lifecycle status (e.g. `Open` / `In Progress` / `Completed`)
- **Location:** Latitude & Longitude coordinates (e.g. `26.84670, 80.94620`) and street address.
- **[View Supporting Reports]:** Interactive toggle listing all attached individual citizen reports with image thumbnails, report IDs, AI confidence, and direct links (`/admin/reports/:id`).
- **[Open in Google Maps]:** Dynamic external link opening `https://www.google.com/maps?q={latitude},{longitude}` in a new tab (`target="_blank" rel="noopener noreferrer"`).

### Preserved Existing Functionality
- **ReportDetails Page:** [frontend/src/pages/admin/ReportDetails.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/ReportDetails.jsx) remains 100% intact, including its existing Google Maps button.
- **Dynamic Coordinates:** Zero hardcoded coordinates; coordinates are dynamically parsed from GeoJSON `[longitude, latitude]` payload and safely validated before rendering.

### Files Added / Modified in Step 6
- **[frontend/src/pages/admin/IssueDetails.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/IssueDetails.jsx)** (NEW: Implements dedicated IssueDetails view with ROAD ISSUE summary card, supporting reports inspection list, and Google Maps integration)
- **[frontend/src/App.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/App.jsx)** (MODIFIED: Registered `/admin/issues/:id` route for `IssueDetails`)
- **[frontend/src/pages/admin/Map.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Map.jsx)** (MODIFIED: Updated popups and sidebar items to navigate to `/admin/issues/:id` and render exact ROAD ISSUE format)
- **[ROADWISE_FEATURE_CHANGES.md](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/ROADWISE_FEATURE_CHANGES.md)** (MODIFIED: Documented Step 6 UI specification)

### Step 6 Rollback Procedure
To rollback Step 6:
1. Revert [frontend/src/App.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/App.jsx) to remove `/admin/issues/:id`.
2. Delete [frontend/src/pages/admin/IssueDetails.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/IssueDetails.jsx).
3. Revert [frontend/src/pages/admin/Map.jsx](file:///c:/Users/Avi%20Mishra/Desktop/roadwise-sih-2026/frontend/src/pages/admin/Map.jsx) navigation links to direct report routes.

### Step 6 Build Result
- `npm run build` completed cleanly: `built in 358ms` (0 errors, `dist/assets/index-B9NJjESw.js`).
