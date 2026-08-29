const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const Report = require("../models/report.model");
const Issue = require("../models/issue.model");

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

    // 2. Ensure uploads directory exists and save image to disk
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExtension = path.extname(uploadedFile.originalname || ".jpg") || ".jpg";
    const filename = `report-${Date.now()}-${Math.floor(Math.random() * 100000)}${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);

    // Save file buffer to disk
    fs.writeFileSync(filePath, uploadedFile.buffer);
    const imageUrl = `/uploads/${filename}`;

    // 3. Forward image buffer to FastAPI AI service
    const formData = new FormData();
    formData.append("file", uploadedFile.buffer, {
      filename: uploadedFile.originalname || filename,
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

    // 4. Map AI detection results to Mongoose Report Schema
    const allowedDamageTypes = ["pothole", "open_manhole", "crack", "road_surface_damage", "other"];
    const allowedSeverities = ["low", "medium", "high"];

    const damageType = allowedDamageTypes.includes(aiResult.damage_type)
      ? aiResult.damage_type
      : "other";

    const severity = allowedSeverities.includes(aiResult.severity)
      ? aiResult.severity
      : "low";

    const confidence = typeof aiResult.confidence === "number" ? aiResult.confidence : 0;
    const priorityScore = typeof aiResult.priority_score === "number" ? aiResult.priority_score : 0;

    // 5. Parse location coordinates [longitude, latitude] & accuracy
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

    // 6. Build and save Report document to MongoDB
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
      description,
      status: "reported",
    };

    if (req.body.userId) {
      reportData.userId = req.body.userId;
    }

    const report = new Report(reportData);
    const savedReport = await report.save();

    // 7. Smart Duplicate Issue Detection & Clustering
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

module.exports = {
  createReport,
  getReports,
};
