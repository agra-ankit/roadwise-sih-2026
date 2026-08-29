# RoadWise Historical Report Migration Log

This log records all execution runs of the historical report migration script (`backend/scripts/migrateReportsToIssues.js`).

---

## Migration Specification
- **Grouping Distance:** 30 meters maximum radius ($\le 30\text{m}$)
- **Matching Rule:** Exact string match on `damageType` (`Issue.damageType === Report.damageType`)
- **Supporting-Report Search:** Proximity search against existing supporting reports first, then Issue location fallback
- **Severity Hierarchy:** Highest severity among attached reports (`low < medium < high`)
- **Idempotency:** Idempotent (reports already linked to an `Issue` are automatically skipped on re-runs)
- **Source Data Integrity:** 100% preserved. Zero `Report` documents deleted or modified.

---

## Log Entries

### Execution 1: Dry-Run Mode (`--dry-run`)
- **Date/Time:** 2026-08-27T21:32:00+05:30
- **Mode:** DRY-RUN (`node backend/scripts/migrateReportsToIssues.js --dry-run`)
- **Total Reports Scanned:** 0 (Clean test database baseline)
- **Reports with Valid Coordinates:** 0
- **Already Linked Reports (Skipped):** 0
- **Invalid Data Reports (Skipped):** 0
- **Issues Created (Simulated):** 0
- **Existing Issues Reused (Simulated):** 0
- **Reports Attached (Simulated):** 0
- **Duplicate Attachments Prevented:** 0
- **Errors Encountered:** 0
- **Database Status:** ZERO database modifications made.

### Execution 2: Real Atlas Database Live Migration (`LIVE`)
- **Date/Time:** 2026-08-28T00:35:36+05:30
- **Mode:** LIVE (`node backend/scripts/migrateReportsToIssues.js`)
- **Database:** `ac-d9jueou-shard-00-00.pnq1l5m.mongodb.net / test`
- **Total Reports Scanned:** 15
- **Already Linked Reports (Skipped):** 8
- **Invalid Data Reports (Skipped):** 0
- **Eligible Reports Processed:** 7
- **Issues Created:** 6
- **Existing Issues Reused:** 1 (Orphan Report `6a9011598d028a298d56458b` attached to Issue `6a90821262a1656dcc701c3e`)
- **Reports Attached:** 7
- **Duplicate Attachments Prevented:** 0
- **Errors Encountered:** 0
- **Database Status:** Successfully completed live historical migration. All 15 original `Report` documents preserved 100% intact. Total Issues: 11.

### Execution 3: Idempotency Verification Run (`LIVE Re-run`)
- **Date/Time:** 2026-08-28T00:35:43+05:30
- **Mode:** LIVE Re-run (`node backend/scripts/migrateReportsToIssues.js`)
- **Total Reports Scanned:** 15
- **Already Linked Reports (Skipped):** 15
- **Additional Issues Created:** 0
- **Additional Reports Attached:** 0
- **Errors Encountered:** 0
- **Result:** Idempotency verified 100% (0 changes on second run).
