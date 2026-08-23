const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report', // Links back to the original damage report
      required: true
    },
    imageUrl: {
      type: String,
      required: true 
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Links to the admin or authority who reviewed it
      required: true
    },
    result: {
      type: String,
      enum: ["approved", "rejected"],
      required: true
    },
    remarks: {
      type: String,
      trim: true
    },
    verifiedAt: {
      type: Date,
      default: Date.now // Automatically logs the exact time of verification
    }
  },
  {
    timestamps: true // Tracks exactly when this record is created or modified
  }
);

// Define the model using the requested format
const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;