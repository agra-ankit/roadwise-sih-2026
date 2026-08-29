const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Report = require('../models/report.model');
const Issue = require('../models/issue.model');
const connectDB = require('../config/db');

// Parse CLI arguments
const isDryRun = process.argv.includes('--dry-run');

async function migrateReportsToIssues() {
  console.log('====================================================');
  console.log(`  ROADWISE REPORT MIGRATION TOOL ${isDryRun ? '(DRY-RUN MODE)' : '(LIVE MODE)'}`);
  console.log('====================================================\n');

  try {
    // 1. Connect to MongoDB and ensure 2dsphere index is built
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/roadwise';
    await mongoose.connect(mongoUri);
    console.log(`[DB] Connected to MongoDB database (${mongoose.connection.name}).`);

    await Issue.createIndexes();
    console.log('[DB] Issue 2dsphere index initialized and verified.\n');

    // 2. Fetch all reports sorted by createdAt asc (process oldest first)
    const allReports = await Report.find().sort({ createdAt: 1 });
    console.log(`[SCAN] Total Reports in database: ${allReports.length}`);

    let stats = {
      totalScanned: allReports.length,
      alreadyLinkedSkipped: 0,
      invalidDataSkipped: 0,
      eligibleToProcess: 0,
      issuesCreated: 0,
      issuesReused: 0,
      reportsAttached: 0,
      duplicatePrevented: 0,
      errors: 0
    };

    // Simulated in-memory Issues for dry-run tracking
    const dryRunIssues = [];

    // Severity order helper
    const severityOrder = { low: 1, medium: 2, high: 3 };

    for (const report of allReports) {
      // Check if report is already attached to an existing Issue in MongoDB
      const existingDbIssue = await Issue.findOne({ reports: report._id });
      if (existingDbIssue) {
        stats.alreadyLinkedSkipped++;
        continue;
      }

      // Extract & validate coordinates
      const coords = report.location?.coordinates;
      const longitude = Array.isArray(coords) ? coords[0] : null;
      const latitude = Array.isArray(coords) ? coords[1] : null;

      const isValidCoordinates =
        typeof longitude === 'number' &&
        typeof latitude === 'number' &&
        !isNaN(longitude) &&
        !isNaN(latitude) &&
        (longitude !== 0 || latitude !== 0) &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90;

      const damageType = report.damageType || 'other';
      const severity = report.severity || 'low';
      const priorityScore = report.priorityScore || 0;

      if (!isValidCoordinates) {
        stats.invalidDataSkipped++;
        console.log(`[SKIP] Report ID ${report._id}: Invalid or zero coordinates (${latitude}, ${longitude}).`);
        continue;
      }

      stats.eligibleToProcess++;

      if (isDryRun) {
        // --- DRY RUN SIMULATION ---
        // Search in-memory dryRunIssues within 30m with matching damageType
        let matchedDryIssue = null;
        for (const dryIssue of dryRunIssues) {
          if (dryIssue.damageType === damageType) {
            // Distance calculation using Haversine formula (in meters)
            const R = 6371000;
            const dLat = (latitude - dryIssue.location.coordinates[1]) * Math.PI / 180;
            const dLon = (longitude - dryIssue.location.coordinates[0]) * Math.PI / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(dryIssue.location.coordinates[1] * Math.PI / 180) *
              Math.cos(latitude * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceMeters = R * c;

            if (distanceMeters <= 30) {
              matchedDryIssue = dryIssue;
              break;
            }
          }
        }

        if (matchedDryIssue) {
          const reportIdStr = report._id.toString();
          if (!matchedDryIssue.reports.includes(reportIdStr)) {
            matchedDryIssue.reports.push(reportIdStr);
            stats.reportsAttached++;
          } else {
            stats.duplicatePrevented++;
          }
          matchedDryIssue.reportCount = matchedDryIssue.reports.length;

          if ((severityOrder[severity] || 1) > (severityOrder[matchedDryIssue.severity] || 1)) {
            matchedDryIssue.severity = severity;
          }
          stats.issuesReused++;
          console.log(`[SIMULATE ATTACH] Report ${report._id} -> Grouped into existing simulated Issue (${matchedDryIssue._id})`);
        } else {
          const newDryIssueId = `SIM_ISSUE_${dryRunIssues.length + 1}`;
          dryRunIssues.push({
            _id: newDryIssueId,
            damageType,
            severity,
            location: { type: 'Point', coordinates: [longitude, latitude], address: report.location?.address },
            reports: [report._id.toString()],
            reportCount: 1,
            priorityScore
          });
          stats.issuesCreated++;
          stats.reportsAttached++;
          console.log(`[SIMULATE CREATE] Report ${report._id} -> New simulated Issue (${newDryIssueId}) created`);
        }
      } else {
        // --- REAL LIVE MIGRATION ---
        try {
          // 1. Search for nearby supporting Report (other than this report) within 30m matching damageType
          const nearbyReport = await Report.findOne({
            _id: { $ne: report._id },
            damageType: damageType,
            location: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [longitude, latitude]
                },
                $maxDistance: 30
              }
            }
          });

          let targetIssue = null;
          if (nearbyReport) {
            targetIssue = await Issue.findOne({ reports: nearbyReport._id });
          }

          if (!targetIssue) {
            targetIssue = await Issue.findOne({
              damageType: damageType,
              location: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                  },
                  $maxDistance: 30
                }
              }
            });
          }

          if (targetIssue) {
            const reportIdStr = report._id.toString();
            const existingReportIds = targetIssue.reports.map((id) => id.toString());

            if (!existingReportIds.includes(reportIdStr)) {
              targetIssue.reports.push(report._id);
              stats.reportsAttached++;
            } else {
              stats.duplicatePrevented++;
            }
            targetIssue.reportCount = targetIssue.reports.length;

            const currentWeight = severityOrder[targetIssue.severity] || 1;
            const newWeight = severityOrder[severity] || 1;
            if (newWeight > currentWeight) {
              targetIssue.severity = severity;
            }

            if (priorityScore > (targetIssue.priorityScore || 0)) {
              targetIssue.priorityScore = priorityScore;
            }

            targetIssue.updatedAt = new Date();
            await targetIssue.save();
            stats.issuesReused++;
            console.log(`[LIVE ATTACH] Report ${report._id} -> Attached to Issue ${targetIssue._id}`);
          } else {
            const newIssue = new Issue({
              damageType: damageType,
              severity: severity,
              location: {
                type: 'Point',
                coordinates: [longitude, latitude],
                address: report.location?.address || ''
              },
              locationAccuracy: report.locationAccuracy || null,
              reports: [report._id],
              reportCount: 1,
              priorityScore: priorityScore,
              status: report.status || 'reported'
            });
            await newIssue.save();
            stats.issuesCreated++;
            stats.reportsAttached++;
            console.log(`[LIVE CREATE] Report ${report._id} -> Created new Issue ${newIssue._id}`);
          }
        } catch (err) {
          stats.errors++;
          console.error(`[ERROR] Failed to process Report ID ${report._id}:`, err.message);
        }
      }
    }

    console.log('\n====================================================');
    console.log(`  MIGRATION SUMMARY ${isDryRun ? '(DRY-RUN RESULT - NO CHANGES MADE)' : '(LIVE RESULT)'}`);
    console.log('====================================================');
    console.log(`Total Reports Scanned:           ${stats.totalScanned}`);
    console.log(`Already Linked Reports (Skipped):${stats.alreadyLinkedSkipped}`);
    console.log(`Invalid Data Reports (Skipped):  ${stats.invalidDataSkipped}`);
    console.log(`Eligible Reports Processed:      ${stats.eligibleToProcess}`);
    console.log(`Issues Created:                  ${stats.issuesCreated}`);
    console.log(`Existing Issues Reused:          ${stats.issuesReused}`);
    console.log(`Reports Attached:                ${stats.reportsAttached}`);
    console.log(`Duplicate Attachments Prevented: ${stats.duplicatePrevented}`);
    console.log(`Errors Encountered:              ${stats.errors}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    return stats;
  } catch (fatalErr) {
    console.error('Fatal Migration Error:', fatalErr.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

migrateReportsToIssues();
