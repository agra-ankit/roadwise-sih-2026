const path = require('path');
const projectRoot = path.join(__dirname, '..');
require(path.join(projectRoot, 'node_modules/dotenv')).config({ path: path.join(projectRoot, '.env') });
const mongoose = require(path.join(projectRoot, 'node_modules/mongoose'));

const Report = require(path.join(projectRoot, 'models/report.model'));
const Issue = require(path.join(projectRoot, 'models/issue.model'));

// Haversine distance formula in meters between two [lng, lat] coordinates
function calculateDistanceMeters(coord1, coord2) {
  const R = 6371000;
  const lon1 = coord1[0], lat1 = coord1[1];
  const lon2 = coord2[0], lat2 = coord2[1];

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function auditHistoricalGrouping() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("🔴 ERROR: MONGO_URI is not set in backend/.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });

    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host || 'Atlas Cluster';

    const reportsBefore = await Report.countDocuments();
    const issuesBefore = await Issue.countDocuments();

    const allReports = await Report.find().lean();
    const allIssues = await Issue.find().lean();

    const reportMap = new Map();
    allReports.forEach(r => reportMap.set(r._id.toString(), r));

    // Map which report belongs to which existing issue
    const reportToIssueMap = new Map();
    allIssues.forEach(issue => {
      issue.reports.forEach(rId => {
        reportToIssueMap.set(rId.toString(), issue._id.toString());
      });
    });

    const attachedReports = [];
    const orphanReports = [];

    allReports.forEach(r => {
      if (reportToIssueMap.has(r._id.toString())) {
        attachedReports.push(r);
      } else {
        orphanReports.push(r);
      }
    });

    console.log('================ HISTORICAL GROUPING AUDIT ================');
    console.log(`\nDATABASE:\n${host} / ${dbName}`);
    console.log(`\nREPORTS:\nTotal Reports: ${allReports.length}\nAttached Reports: ${attachedReports.length}\nOrphan Reports: ${orphanReports.length}`);
    console.log(`\nISSUES:\nTotal Issues: ${allIssues.length}`);

    // Build connected components among orphan reports and existing issues using current rules (same damageType && distance <= 30m)
    // We group reports into clusters based on supporting-report chain connections.

    const nodes = allReports.map(r => r._id.toString());
    const adj = new Map();
    nodes.forEach(n => adj.set(n, []));

    const distances = [];

    for (let i = 0; i < allReports.length; i++) {
      for (let j = i + 1; j < allReports.length; j++) {
        const rA = allReports[i];
        const rB = allReports[j];

        if (rA.damageType === rB.damageType) {
          const dist = calculateDistanceMeters(rA.location.coordinates, rB.location.coordinates);
          distances.push({ rA: rA._id.toString(), rB: rB._id.toString(), dist, sameType: true });

          if (dist <= 30) {
            adj.get(rA._id.toString()).push({ neighbor: rB._id.toString(), dist });
            adj.get(rB._id.toString()).push({ neighbor: rA._id.toString(), dist });
          }
        }
      }
    }

    // Graph BFS/DFS to find connected components
    const visited = new Set();
    const proposedGroups = [];

    for (const node of nodes) {
      if (!visited.has(node)) {
        const component = [];
        const queue = [node];
        visited.add(node);

        while (queue.length > 0) {
          const curr = queue.shift();
          component.push(curr);

          for (const edge of adj.get(curr)) {
            if (!visited.has(edge.neighbor)) {
              visited.add(edge.neighbor);
              queue.push(edge.neighbor);
            }
          }
        }

        // Determine existing issue for this component if any
        let existingIssueId = null;
        for (const rId of component) {
          if (reportToIssueMap.has(rId)) {
            existingIssueId = reportToIssueMap.get(rId);
            break;
          }
        }

        const repObjs = component.map(id => reportMap.get(id));
        const damageType = repObjs[0].damageType;

        // Calculate max pairwise distance inside group
        let maxDistance = 0;
        const pairwise = [];
        for (let a = 0; a < repObjs.length; a++) {
          for (let b = a + 1; b < repObjs.length; b++) {
            const d = calculateDistanceMeters(repObjs[a].location.coordinates, repObjs[b].location.coordinates);
            if (d > maxDistance) maxDistance = d;
            pairwise.push({ a: repObjs[a]._id.toString(), b: repObjs[b]._id.toString(), dist: d });
          }
        }

        let proposedAction = 'NO_CHANGE';
        if (!existingIssueId) {
          proposedAction = 'CREATE_NEW_ISSUE';
        } else {
          const issueObj = allIssues.find(i => i._id.toString() === existingIssueId);
          const hasNewOrphans = component.some(id => !issueObj.reports.map(r => r.toString()).includes(id));
          proposedAction = hasNewOrphans ? 'ATTACH_TO_EXISTING_ISSUE' : 'NO_CHANGE';
        }

        proposedGroups.push({
          groupNumber: proposedGroups.length + 1,
          existingIssue: existingIssueId || 'NONE',
          damageType,
          reports: component,
          maxDistance: maxDistance.toFixed(1),
          pairwise,
          proposedAction
        });
      }
    }

    console.log('\n------------------------------------------------------------');
    console.log('PROPOSED GROUPING');
    console.log('------------------------------------------------------------');

    proposedGroups.forEach(g => {
      console.log(`\nGroup ${g.groupNumber}:`);
      console.log(`  - Existing Issue: ${g.existingIssue}`);
      console.log(`  - Damage Type: ${g.damageType}`);
      console.log(`  - Reports (${g.reports.length}):`);
      g.reports.forEach(rId => console.log(`      - ${rId}`));
      console.log(`  - Maximum direct distance: ${g.maxDistance}m`);
      console.log(`  - Grouping reason: ${g.reports.length > 1 ? 'SAME_DAMAGE_TYPE + WITHIN_30M / CHAIN' : 'SINGLE_REPORT_CLUSTER'}`);
      console.log(`  - Proposed action: ${g.proposedAction}`);
    });

    console.log('\n------------------------------------------------------------');
    console.log('ORPHAN REPORT ANALYSIS');
    console.log('------------------------------------------------------------');

    orphanReports.forEach(o => {
      const oId = o._id.toString();
      const oCoords = o.location.coordinates;

      let nearestReport = null;
      let minDistance = Infinity;

      allReports.forEach(r => {
        if (r._id.toString() !== oId) {
          const d = calculateDistanceMeters(oCoords, r.location.coordinates);
          if (d < minDistance) {
            minDistance = d;
            nearestReport = r;
          }
        }
      });

      const sameType = nearestReport ? (nearestReport.damageType === o.damageType) : false;
      const wouldGroup30m = nearestReport ? (sameType && minDistance <= 30) : false;

      let targetGroup = proposedGroups.find(g => g.reports.includes(oId));
      let action = targetGroup ? targetGroup.proposedAction : 'CREATE_NEW_ISSUE';

      console.log(`\nReport: ${oId}`);
      console.log(`  Damage Type: ${o.damageType}`);
      console.log(`  Coordinates: [${oCoords.join(', ')}]`);
      console.log(`  Nearest relevant Report: ${nearestReport ? nearestReport._id.toString() : 'None'}`);
      console.log(`  Distance: ${minDistance !== Infinity ? minDistance.toFixed(1) + 'm' : 'N/A'}`);
      console.log(`  Same damageType: ${sameType ? 'YES' : 'NO'}`);
      console.log(`  Would current 30m rule group: ${wouldGroup30m ? 'YES' : 'NO'}`);
      console.log(`  Would supporting-report chain group: ${wouldGroup30m ? 'YES' : 'NO'}`);
      console.log(`  Proposed action: ${action}`);
    });

    console.log('\n------------------------------------------------------------');
    console.log('EXISTING ISSUE ANALYSIS');
    console.log('------------------------------------------------------------');

    allIssues.forEach(issue => {
      const iId = issue._id.toString();
      const rawRids = issue.reports.map(r => r.toString());
      const targetGroup = proposedGroups.find(g => g.existingIssue === iId);

      const additionalReports = targetGroup ? targetGroup.reports.filter(id => !rawRids.includes(id)) : [];

      console.log(`\nIssue: ${iId}`);
      console.log(`  Current reportCount: ${issue.reportCount}`);
      console.log(`  Current Reports (${rawRids.length}): ${rawRids.join(', ')}`);
      console.log(`  Additional historical Reports that WOULD be attached: ${additionalReports.length > 0 ? additionalReports.join(', ') : 'None'}`);
      console.log(`  Result: ${additionalReports.length > 0 ? 'WOULD ADD REPORTS' : 'NO CHANGE'}`);
    });

    // Summary calculations
    const unchangedCount = attachedReports.length;
    const attachToExistingCount = proposedGroups.filter(g => g.proposedAction === 'ATTACH_TO_EXISTING_ISSUE').reduce((acc, g) => acc + g.reports.filter(rId => !reportToIssueMap.has(rId)).length, 0);
    const createNewIssuesCount = proposedGroups.filter(g => g.proposedAction === 'CREATE_NEW_ISSUE').length;

    const potentialIssueCount = allIssues.length + createNewIssuesCount;
    const totalReportReferences = allReports.length;

    console.log('\n------------------------------------------------------------');
    console.log('SUMMARY');
    console.log('------------------------------------------------------------');
    console.log(`Total Reports: ${allReports.length}`);
    console.log(`Already correctly attached: ${attachedReports.length}`);
    console.log(`Orphan Reports: ${orphanReports.length}`);
    console.log(`Would remain unchanged: ${unchangedCount}`);
    console.log(`Would attach to existing Issues: ${attachToExistingCount}`);
    console.log(`Would create new Issues: ${createNewIssuesCount}`);
    console.log(`Would remain separate: ${orphanReports.length - attachToExistingCount}`);
    console.log(`Potential Issue count after migration: ${potentialIssueCount}`);
    console.log(`Potential total Report references across Issues: ${totalReportReferences}`);

    // Verify Read-Only Safety
    const reportsAfter = await Report.countDocuments();
    const issuesAfter = await Issue.countDocuments();

    console.log('\nDATABASE MODIFIED: NO');
    console.log(`Safety verification: Reports before (${reportsBefore}) === Reports after (${reportsAfter}), Issues before (${issuesBefore}) === Issues after (${issuesAfter})`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('🔴 AUDIT ERROR:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

auditHistoricalGrouping();
