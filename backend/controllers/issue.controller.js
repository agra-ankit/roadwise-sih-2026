const Issue = require("../models/issue.model");

/**
 * Fetch all grouped Issues from MongoDB
 * Route: GET /api/issues
 */
const getIssues = async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate({
        path: "reports",
        select: "imageUrl damageType severity priorityScore confidence status location description createdAt"
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json(issues);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch issues from database",
      message: error.message,
    });
  }
};

/**
 * Fetch single Issue by ID with associated reports
 * Route: GET /api/issues/:id
 */
const getIssueById = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id).populate({
      path: "reports",
      select: "imageUrl damageType severity priorityScore confidence status location description createdAt"
    });

    if (!issue) {
      return res.status(404).json({
        error: "Issue not found",
        message: `No issue found with ID ${id}`,
      });
    }

    return res.status(200).json(issue);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch issue details from database",
      message: error.message,
    });
  }
};

module.exports = {
  getIssues,
  getIssueById,
};
