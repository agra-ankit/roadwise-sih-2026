const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report', // Links directly to your Report model
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId, // Changed from String to ObjectId to link to a specific worker's profile
      ref: 'User',
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Links to the admin who created the assignment
      required: true
    },
    status: {
      type: String,
      enum: ["assigned", "in_progress", "completed"],
      default: "assigned"
    },
    assignedAt: {
      type: Date,
      default: Date.now // Automatically grabs the exact time the assignment is created
    },
    completedAt: {
      type: Date,
      default: null // Will remain null until the worker finishes the job
    },
    completionImageUrl: {
      type: String,
      trim: true // Optional at first, required later in your backend logic when marking as 'completed'
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt tracking
  }
);

// Define the model using the requested format
const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;