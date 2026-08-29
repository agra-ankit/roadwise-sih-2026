const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const Report = require("../models/report.model");
const Issue = require("../models/issue.model");

/**
 * Rule-Based Contextual NLP Engine:
 * Analyzes citizen descriptions for critical hazard multipliers (hospitals, schools, accidents, highways).
 */
const analyzeDescriptionContext = (text) => {
  if (!text || typeof text !== "string") {
    return { boost: 0, tags: [] };
  }

  const lower = text.toLowerCase();
  let boost = 0;
  const tags = [];

  if (/\b(hospital|emergency|icu|ambulance|trauma|clinic|dispensary|casualty)\b/.test(lower)) {
    boost += 20;
    tags.push("Hospital / Emergency Zone");
  }

  if (/\b(school|kindergarten|college|university|student|children|kids|child|pedestrian)\b/.test(lower)) {
    boost += 15;
    tags.push("School / Educational Area");
  }

  if (/\b(accident|collision|crash|fatal|fallen|fall|injury|injured|danger|dangerous|critical|risk)\b/.test(lower)) {
    boost += 15;
    tags.push("High Accident Risk");
  }

  if (/\b(highway|expressway|flyover|bridge|junction|blind spot|turn|curve|speed)\b/.test(lower)) {
    boost += 12;
    tags.push("Highway / Fast Corridor");
  }

  if (/\b(metro|railway|bus stop|bus stand|station|market|bazaar|crowded)\b/.test(lower)) {
    boost += 10;
    tags.push("Transit / Public Hub");
  }

  if (/\b(waterlogged|waterlogging|submerged|flood|flooded|rain|drain|drainage|deep|huge|massive)\b/.test(lower)) {
    boost += 8;
    tags.push("Waterlogged / Severe Obstruction");
  }

  return {
    boost: Math.min(25, boost), // Maximum +25 context boost
    tags: tags.slice(0, 3),      // Top 3 context tags
  };
};

/**
 * Create a new damage report with AI analysis and save to MongoDB
 * Route: POST /api/reports
 */
const createReport = async (req, res) => {
  try {
    // 1. Extract uploaded file from req.file or req.files
    const uploadedFile =
      req.file ||
      (req.files && (req.files.file?.[0] || req.files.image?.[0]));

    if (!uploadedFile) {
      return res.status(400).json({
        error: "No image file supplied. Please upload an image under the 'file' or 'image' field.",
      });
    }

    // 2. Stream uploaded RAM buffer directly to FastAPI AI service (0 disk I/O)
    const formData = new FormData();
    formData.append("file", uploadedFile.buffer, {
      filename: uploadedFile.originalname || "image.jpg",
      contentType: uploadedFile.mimetype || "image/jpeg",
    });

    const aiBaseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const aiPredictEndpoint = `${aiBaseUrl}/predict`;

    let aiResult;
    try {
      const aiResponse = await axios.post(aiPredictEndpoint, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });
      aiResult = aiResponse.data;
    } catch (aiError) {
      if (aiError.code === "ECONNREFUSED" || aiError.code === "ENOTFOUND") {
        return res.status(503).json({
          error: "AI Service unavailable. Ensure FastAPI server is running on port 8000.",
          details: aiError.message,
        });
      }
      return res.status(502).json({
        error: "AI Service prediction failed.",
        details: aiError.response ? aiError.response.data : aiError.message,
      });
    }

    // 3. AI Verification Gatekeeper: If no hazard detected, reject immediately (0 Disk Writes, 0 DB Writes)
    const isHazardDetected = aiResult.damage_detected === true && (typeof aiResult.confidence === "number" && aiResult.confidence >= 0.25);

    if (!isHazardDetected) {
      const rejectionReason = aiResult.rejection_reason || "No pothole or road hazard was detected in this photo.";

      return res.status(422).json({
        error: "No Road Defect Detected",
        message: `${rejectionReason} Please upload a clear photo of an asphalt road hazard.`,
        isRejected: true,
        aiDetails: aiResult,
      });
    }

    // 4. ONLY for verified hazards: Save image buffer to disk
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExtension = path.extname(uploadedFile.originalname || ".jpg") || ".jpg";
    const filename = `report-${Date.now()}-${Math.floor(Math.random() * 100000)}${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, uploadedFile.buffer);
    const imageUrl = `/uploads/${filename}`;

    // 5. Map AI detection results to Mongoose Report Schema
    const allowedDamageTypes = ["pothole", "open_manhole", "crack", "road_surface_damage", "other"];
    const allowedSeverities = ["low", "medium", "high"];

    const damageType = allowedDamageTypes.includes(aiResult.damage_type)
      ? aiResult.damage_type
      : "other";

    const severity = allowedSeverities.includes(aiResult.severity)
      ? aiResult.severity
      : "low";

    const confidence = typeof aiResult.confidence === "number" ? aiResult.confidence : 0;
    const basePriorityScore = typeof aiResult.priority_score === "number" ? aiResult.priority_score : 0;

    // 6. Parse location coordinates [longitude, latitude] & accuracy
    const latitude = parseFloat(req.body.latitude || req.body.lat) || 0;
    const longitude = parseFloat(req.body.longitude || req.body.lng || req.body.lon) || 0;
    
    let locationAccuracy = null;
    const rawAccuracy = req.body.locationAccuracy || req.body.accuracy;
    if (rawAccuracy !== undefined && rawAccuracy !== null && rawAccuracy !== "") {
      const parsedAcc = parseFloat(rawAccuracy);
      if (!isNaN(parsedAcc) && isFinite(parsedAcc) && parsedAcc >= 0) {
        locationAccuracy = parsedAcc;
      }
    }

    const address = req.body.address || "";
    const description = req.body.description || "";

    // 6. Context-Aware NLP Description Analysis (School, Hospital, Hazard Multipliers)
    const contextAnalysis = analyzeDescriptionContext(description);
    const priorityScore = Math.min(100, Math.max(0, basePriorityScore + contextAnalysis.boost));

    const citizenId = req.body.citizenId || req.headers["x-citizen-id"] || null;
    const citizenContact = (req.body.citizenContact || req.body.phone || req.body.email || "").trim() || null;
    const citizenName = (req.body.citizenName || req.body.name || "").trim() || null;

    // 7. Build and save Report document to MongoDB
    const reportData = {
      imageUrl,
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // GeoJSON order: [lng, lat]
        address,
      },
      locationAccuracy,
      damageType,
      severity,
      confidence,
      priorityScore,
      contextTags: contextAnalysis.tags,
      contextBoost: contextAnalysis.boost,
      description,
      status: "reported",
      citizenId,
      citizenContact,
      citizenName,
    };

    if (req.body.userId) {
      reportData.userId = req.body.userId;
    }

    const report = new Report(reportData);
    const savedReport = await report.save();

    // 8. Smart Duplicate Issue Detection & Clustering (Only for verified hazards)
    let issue = null;
    try {
      const isValidCoordinates =
        typeof longitude === "number" &&
        typeof latitude === "number" &&
        !isNaN(longitude) &&
        !isNaN(latitude) &&
        (longitude !== 0 || latitude !== 0) &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90;

      if (isValidCoordinates) {
        // Step 2.5: Supporting-Report Based Grouping
        // 1. Search for any existing supporting Report (other than savedReport itself) within 30m matching exact damageType
        const nearbyReport = await Report.findOne({
          _id: { $ne: savedReport._id },
          damageType: damageType,
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              $maxDistance: 30, // 30 meters maximum clustering distance
            },
          },
        });

        let targetIssue = null;

        if (nearbyReport) {
          // Find the parent Issue containing this nearby supporting report
          targetIssue = await Issue.findOne({ reports: nearbyReport._id });
        }

        // 2. Fallback: If no nearby supporting report was found, check $near directly on Issue location
        if (!targetIssue) {
          targetIssue = await Issue.findOne({
            damageType: damageType,
            location: {
              $near: {
                $geometry: {
                  type: "Point",
                  coordinates: [longitude, latitude],
                },
                $maxDistance: 30,
              },
            },
          });
        }

        if (targetIssue) {
          // Attach report to existing Issue safely without duplicate IDs
          issue = targetIssue;
          const reportIdStr = savedReport._id.toString();
          const existingReportIds = issue.reports.map((id) => id.toString());

          if (!existingReportIds.includes(reportIdStr)) {
            issue.reports.push(savedReport._id);
          }
          issue.reportCount = issue.reports.length;

          // Severity aggregation rule: Issue severity represents the highest severity among linked reports (low < medium < high)
          const severityOrder = { low: 1, medium: 2, high: 3 };
          const currentWeight = severityOrder[issue.severity] || 1;
          const newWeight = severityOrder[severity] || 1;
          if (newWeight > currentWeight) {
            issue.severity = severity;
          }

          // Priority score calculation: preserve maximum priority score
          if (priorityScore > (issue.priorityScore || 0)) {
            issue.priorityScore = priorityScore;
          }

          // Merge context tags
          if (contextAnalysis.tags.length > 0) {
            const currentTags = issue.contextTags || [];
            issue.contextTags = Array.from(new Set([...currentTags, ...contextAnalysis.tags]));
          }

          issue.updatedAt = new Date();
          await issue.save();
        } else {
          // Create new Issue for this report
          issue = new Issue({
            damageType: damageType,
            severity: severity,
            location: {
              type: "Point",
              coordinates: [longitude, latitude],
              address: address,
            },
            locationAccuracy: locationAccuracy,
            reports: [savedReport._id],
            reportCount: 1,
            priorityScore: priorityScore,
            contextTags: contextAnalysis.tags,
            status: "reported",
          });
          await issue.save();
        }
      } else {
        // Fallback for missing/zero coordinates: create standalone Issue
        issue = new Issue({
          damageType: damageType,
          severity: severity,
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
            address: address,
          },
          reports: [savedReport._id],
          reportCount: 1,
          priorityScore: priorityScore,
          contextTags: contextAnalysis.tags,
          status: "reported",
        });
        await issue.save();
      }
    } catch (groupingError) {
      console.error("Smart Issue Grouping error (Report saved safely):", groupingError);
      // Fail-safe: Report remains saved safely in MongoDB even if grouping encounters an issue
    }

    return res.status(201).json({
      message: "Report created successfully",
      report: savedReport,
      ai_analysis: aiResult,
      issue: issue,
    });

  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "MongoDB Schema validation failed",
        details: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal server error while creating report",
      message: error.message,
    });
  }
};

/**
 * Fetch all reports from MongoDB
 * Route: GET /api/reports
 */
const getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.status(200).json(reports);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch reports from database",
      message: error.message,
    });
  }
};

/**
 * Fetch a single report by ID with populated user and assignment details
 * Route: GET /api/reports/:id
 */
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id)
      .populate("userId", "name email")
      .populate("assignedTo", "name email");

    if (!report) {
      return res.status(404).json({
        error: "Report not found",
        message: `No report found with ID ${id}`,
      });
    }

    return res.status(200).json(report);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch report from database",
      message: error.message,
    });
  }
};

/**
 * Update report status
 * Route: PATCH /api/reports/:id/status or PUT /api/reports/:id/status
 */
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "reported",
      "verified",
      "assigned",
      "in_progress",
      "completed",
      "rejected",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        message: `Status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        error: "Report not found",
        message: `No report found with ID ${id}`,
      });
    }

    return res.status(200).json({
      message: "Report status updated successfully",
      report,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update report status",
      message: error.message,
    });
  }
};

/**
 * Track damage report by ID or short code (e.g. RW-7A2B3C)
 * Route: GET /api/reports/track/:query
 */
const trackReport = async (req, res) => {
  try {
    const rawQuery = (req.params.query || "").trim();
    if (!rawQuery) {
      return res.status(400).json({
        error: "Query parameter required",
        message: "Please provide a Report ID or Ticket Code (e.g. RW-7A2B3C)",
      });
    }

    let report = null;

    // 1. Try matching by exact MongoDB ObjectId
    if (rawQuery.length === 24 && /^[0-9a-fA-F]{24}$/.test(rawQuery)) {
      report = await Report.findById(rawQuery)
        .populate("userId", "name email")
        .populate("assignedTo", "name email");
    }

    // 2. Try matching by short code (e.g. RW-7A2B3C or 7A2B3C)
    if (!report) {
      const cleanCode = rawQuery.replace(/^RW-/i, "").toLowerCase();
      if (cleanCode.length >= 4) {
        const allReports = await Report.find()
          .populate("userId", "name email")
          .populate("assignedTo", "name email")
          .sort({ createdAt: -1 });

        report = allReports.find((r) =>
          r._id.toString().toLowerCase().endsWith(cleanCode)
        );
      }
    }

    if (!report) {
      return res.status(404).json({
        error: "Report not found",
        message: `No report found matching ticket code "${rawQuery}"`,
      });
    }

    // Find parent Issue if clustered
    const issue = await Issue.findOne({ reports: report._id });

    return res.status(200).json({
      success: true,
      report,
      issue,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Tracking query failed",
      message: error.message,
    });
  }
};

/**
 * Mark report as completed with repair verification photo
 * Route: POST /api/reports/:id/complete
 */
const completeReport = async (req, res) => {
  try {
    const { id } = req.params;
    const uploadedFile =
      req.file ||
      (req.files && (req.files.file?.[0] || req.files.image?.[0]));

    let completionImageUrl = req.body.completionImageUrl || "";

    if (uploadedFile) {
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const fileExtension = path.extname(uploadedFile.originalname || ".jpg") || ".jpg";
      const filename = `repair-${Date.now()}-${Math.floor(Math.random() * 100000)}${fileExtension}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, uploadedFile.buffer);
      completionImageUrl = `/uploads/${filename}`;
    }

    if (!completionImageUrl) {
      return res.status(400).json({
        error: "Completion photo required",
        message: "Please upload an after-repair photo or provide completionImageUrl",
      });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      {
        status: "completed",
        completionImageUrl,
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        error: "Report not found",
        message: `No report found with ID ${id}`,
      });
    }

    // Update parent Issue status and completion photo if applicable
    await Issue.updateMany(
      { reports: report._id },
      { status: "completed", completionImageUrl }
    );

    return res.status(200).json({
      message: "Repair marked as completed with verification photo",
      report,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to complete repair",
      message: error.message,
    });
  }
};

/**
 * Assign report to municipal repair team with SLA deadline and notes
 * Route: POST /api/reports/:id/assign or PATCH /api/reports/:id/assign
 */
const assignReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      assignedTeam,
      slaHours = 24,
      targetDeadline,
      assignmentNotes,
    } = req.body;

    if (!assignedTeam || !assignedTeam.trim()) {
      return res.status(400).json({
        error: "Assigned team is required",
        message: "Please select a municipal repair unit (e.g. Team Alpha)",
      });
    }

    const sla = parseInt(slaHours, 10) || 24;
    const deadline = targetDeadline
      ? new Date(targetDeadline)
      : new Date(Date.now() + sla * 60 * 60 * 1000);

    const report = await Report.findByIdAndUpdate(
      id,
      {
        status: "assigned",
        assignedTeam: assignedTeam.trim(),
        slaHours: sla,
        targetDeadline: deadline,
        assignmentNotes: assignmentNotes ? assignmentNotes.trim() : null,
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        error: "Report not found",
        message: `No report found with ID ${id}`,
      });
    }

    // Cascade assignment to parent Issue
    await Issue.updateMany(
      { reports: report._id },
      {
        status: "assigned",
        assignedTeam: assignedTeam.trim(),
        slaHours: sla,
        targetDeadline: deadline,
      }
    );

    return res.status(200).json({
      message: `Report assigned to ${assignedTeam.trim()} with ${sla}h SLA deadline`,
      report,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to assign repair team",
      message: error.message,
    });
  }
};

/**
 * Get dynamic citizen karma & impact stats from MongoDB
 * Route: GET /api/reports/karma
 */
const getCitizenKarma = async (req, res) => {
  try {
    const { identifier, citizenId } = req.query;

    // Retroactive Auto-Linking: If citizen provides contact info,
    // link all previous anonymous reports from this device (citizenId) to their contact in MongoDB!
    if (identifier && identifier.trim() && citizenId && citizenId.trim()) {
      const cleanContact = identifier.trim();
      const cleanCitizenId = citizenId.trim();
      try {
        await Report.updateMany(
          { citizenId: cleanCitizenId, citizenContact: { $in: [null, ""] } },
          { $set: { citizenContact: cleanContact } }
        );
      } catch (linkErr) {
        console.warn("Could not auto-link past reports:", linkErr.message);
      }
    }

    const queryFilters = [];
    if (identifier && identifier.trim()) {
      const cleanIdent = identifier.trim();
      queryFilters.push({ citizenContact: cleanIdent });
      queryFilters.push({ citizenName: new RegExp(`^${cleanIdent}$`, "i") });
    }
    if (citizenId && citizenId.trim()) {
      queryFilters.push({ citizenId: citizenId.trim() });
    }

    // If neither identifier nor citizenId is provided, return default baseline
    if (queryFilters.length === 0) {
      return res.json({
        totalPoints: 0,
        totalReports: 0,
        completedCount: 0,
        potholesCount: 0,
        manholesCount: 0,
        tier: "Bronze Road Guardian",
        tierColor: "#cd7f32",
        tierIcon: "🥉",
        citizenName: "Citizen Contributor",
        reports: [],
      });
    }

    const reports = await Report.find({
      $or: queryFilters,
      status: { $ne: "rejected" },
    }).sort({ createdAt: -1 });

    const totalReports = reports.length;
    const potholesCount = reports.filter((r) => r.damageType === "pothole").length;
    const manholesCount = reports.filter((r) => r.damageType === "open_manhole").length;
    const completedCount = reports.filter(
      (r) => r.status === "completed" || r.status === "resolved"
    ).length;

    const totalPoints = (potholesCount * 15) + (manholesCount * 25) + (completedCount * 10);

    let tier = "Bronze Road Guardian";
    let tierColor = "#cd7f32";
    let tierIcon = "🥉";

    if (totalPoints >= 150) {
      tier = "Gold Smart City Pioneer";
      tierColor = "#facc15";
      tierIcon = "🥇";
    } else if (totalPoints >= 50) {
      tier = "Silver Civic Champion";
      tierColor = "#22d3ee";
      tierIcon = "🥈";
    }

    const latestReportWithName = reports.find((r) => r.citizenName);
    const resolvedName = latestReportWithName ? latestReportWithName.citizenName : (identifier || "Citizen Contributor");

    return res.json({
      totalPoints,
      totalReports,
      completedCount,
      potholesCount,
      manholesCount,
      tier,
      tierColor,
      tierIcon,
      citizenName: resolvedName,
      reports: reports.slice(0, 10),
    });
  } catch (error) {
    console.error("Error computing citizen karma:", error);
    return res.status(500).json({ error: "Failed to compute karma statistics" });
  }
};

/**
 * Get Citywide Civic Leaderboard from MongoDB
 * Route: GET /api/reports/leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const reports = await Report.find({ status: { $ne: "rejected" } });

    // Group reports by citizen identifier (phone, email, citizenId, or citizenName)
    const citizenMap = new Map();

    reports.forEach((r) => {
      const key = r.citizenContact || r.citizenId || r.citizenName || "Anonymous";
      if (!citizenMap.has(key)) {
        citizenMap.set(key, {
          id: key,
          name: r.citizenName || r.citizenContact || key,
          potholes: 0,
          manholes: 0,
          completed: 0,
          totalReports: 0,
          points: 0,
        });
      }

      const c = citizenMap.get(key);
      c.totalReports += 1;
      if (r.damageType === "pothole") c.potholes += 1;
      if (r.damageType === "open_manhole") c.manholes += 1;
      if (r.status === "completed" || r.status === "resolved") c.completed += 1;
      if (r.citizenName && !c.name.includes(r.citizenName)) c.name = r.citizenName;
    });

    const liveCitizens = Array.from(citizenMap.values()).map((c) => {
      const points = (c.potholes * 15) + (c.manholes * 25) + (c.completed * 10);
      let tier = "Bronze Road Guardian";
      let tierColor = "#cd7f32";
      let tierIcon = "🥉";
      if (points >= 150) {
        tier = "Gold Smart City Pioneer";
        tierColor = "#facc15";
        tierIcon = "🥇";
      } else if (points >= 50) {
        tier = "Silver Civic Champion";
        tierColor = "#22d3ee";
        tierIcon = "🥈";
      }
      return {
        ...c,
        points,
        tier,
        tierColor,
        tierIcon,
      };
    });

    liveCitizens.sort((a, b) => b.points - a.points);

    const rankedList = liveCitizens.map((c, idx) => ({
      rank: idx + 1,
      ...c,
    }));

    return res.json({
      leaderboard: rankedList.slice(0, 50),
      totalCityKarma: rankedList.reduce((sum, c) => sum + c.points, 0),
      totalCityReports: rankedList.reduce((sum, c) => sum + c.totalReports, 0),
    });
  } catch (error) {
    console.error("Error computing leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch city leaderboard" });
  }
};

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  trackReport,
  completeReport,
  assignReport,
  getCitizenKarma,
  getLeaderboard,
  analyzeDescriptionContext,
};
