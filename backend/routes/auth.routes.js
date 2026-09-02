const express = require("express");
const { login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin user & get token
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in admin user
 * @access  Private
 */
router.get("/me", protect, getMe);

module.exports = router;
