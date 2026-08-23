const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    
    // REFINED: GeoJSON Location Format
    location: {
      type: {
        type: String,
        enum: ['Point'], // MongoDB requires this exact word for map points
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number], // Note: MongoDB expects [longitude, latitude] in this exact order
        required: true
      },
      address: {
        type: String,
        trim: true
      }
    },

    damageType: {
      type: String,
      enum: ["pothole", "crack", "road_surface_damage", "other"],
      required: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1 // For YOLO confidence scores (0.0 to 1.0)
    },
    priorityScore: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["reported", "verified", "assigned", "in_progress", "completed", "rejected"],
      default: "reported"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true // Automatically handles createdAt and updatedAt
  }
);

// REFINED: Add a spatial index to make map searches lightning fast
reportSchema.index({ location: '2dsphere' });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;