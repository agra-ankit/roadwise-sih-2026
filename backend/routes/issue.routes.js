const express = require("express");
const { getIssues, getIssueById } = require("../controllers/issue.controller");

const router = express.Router();

/**
 * @route   GET /api/issues
 * @desc    Fetch all grouped issues from MongoDB
 * @access  Public
 */
router.get("/", getIssues);

/**
 * @route   GET /api/issues/:id
 * @desc    Fetch single issue details with populated reports
 * @access  Public
 */
router.get("/:id", getIssueById);

module.exports = router;
