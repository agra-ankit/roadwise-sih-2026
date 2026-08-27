const express = require("express");
const multer = require("multer");
const { createReport, getReports } = require("../controllers/report.controller");

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

module.exports = router;
