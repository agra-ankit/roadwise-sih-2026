const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const Report = require("../models/report.model");

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

    // 5. Parse location coordinates [longitude, latitude]
    const latitude = parseFloat(req.body.latitude || req.body.lat) || 0;
    const longitude = parseFloat(req.body.longitude || req.body.lng || req.body.lon) || 0;
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

    return res.status(201).json({
      message: "Report created successfully",
      report: savedReport,
      ai_analysis: aiResult,
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
