const express = require("express");
const multer = require("multer");
const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  trackReport,
  completeReport,
  assignReport,
  getCitizenKarma,
  getLeaderboard,
} = require("../controllers/report.controller");

const router = express.Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// Accept image upload under 'image' or 'file' form fields
const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

/**
 * @route   POST /api/reports
 * @desc    Submit damage report image + location, process via AI, and save to MongoDB
 * @access  Public
 */
router.post("/", uploadFields, createReport);

/**
 * @route   GET /api/reports
 * @desc    Fetch all damage reports from MongoDB
 * @access  Public
 */
router.get("/", getReports);

/**
 * @route   GET /api/reports/karma
 * @desc    Get verified citizen karma & impact metrics from MongoDB
 * @access  Public
 */
router.get("/karma", getCitizenKarma);

/**
 * @route   GET /api/reports/leaderboard
 * @desc    Get Citywide Civic Leaderboard rankings from MongoDB
 * @access  Public
 */
router.get("/leaderboard", getLeaderboard);

/**
 * @route   GET /api/reports/track/:query
 * @desc    Track report status by MongoDB ObjectId or short ticket code (e.g. RW-7A2B3C)
 * @access  Public
 */
router.get("/track/:query", trackReport);

/**
 * @route   GET /api/reports/:id
 * @desc    Fetch single damage report by ID
 * @access  Public
 */
router.get("/:id", getReportById);

/**
 * @route   PATCH /api/reports/:id/status or PUT /api/reports/:id/status
 * @desc    Update damage report status
 * @access  Public
 */
router.patch("/:id/status", updateReportStatus);
router.put("/:id/status", updateReportStatus);

/**
 * @route   POST /api/reports/:id/assign or PATCH /api/reports/:id/assign
 * @desc    Assign repair team and SLA deadline to report
 * @access  Public
 */
router.post("/:id/assign", express.json(), assignReport);
router.patch("/:id/assign", express.json(), assignReport);

/**
 * @route   POST /api/reports/:id/complete
 * @desc    Upload after-repair photo and mark report completed
 * @access  Public
 */
router.post("/:id/complete", uploadFields, completeReport);

module.exports = router;
