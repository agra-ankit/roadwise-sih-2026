const express = require("express");
const multer = require("multer");
const { predictDamage } = require("../controllers/ai.controller");

const router = express.Router();

// Multer memory storage configuration (keeps file in buffer without writing to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// Accept single upload under 'file' or 'image' field
const uploadFields = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

/**
 * @route   POST /api/ai/predict
 * @desc    Receive image file and forward to FastAPI AI Service for road damage detection
 * @access  Public
 */
router.post("/predict", uploadFields, predictDamage);

module.exports = router;
