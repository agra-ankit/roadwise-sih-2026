const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    damageType: {
      type: String,
      enum: ["pothole", "open_manhole", "crack", "road_surface_damage", "other"],
      required: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number], // Note: MongoDB expects [longitude, latitude] in this exact order
        required: true,
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              typeof val[0] === 'number' &&
              typeof val[1] === 'number' &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: 'Coordinates must be an array of [longitude, latitude] where longitude is between -180 and 180, and latitude is between -90 and 90.'
        }
      },
      address: {
        type: String,
        trim: true
      }
    },
    locationAccuracy: {
      type: Number,
      min: 0,
      default: null
    },
    reports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
      }
    ],
    reportCount: {
      type: Number,
      default: 0
    },
    priorityScore: {
      type: Number,
      default: 0
    },
    completionImageUrl: {
      type: String,
      default: null,
      trim: true
    },
    contextTags: {
      type: [String],
      default: []
    },
    assignedTeam: {
      type: String,
      default: null,
      trim: true
    },
    targetDeadline: {
      type: Date,
      default: null
    },
    slaHours: {
      type: Number,
      default: 24
    },
    status: {
      type: String,
      enum: ["reported", "verified", "assigned", "in_progress", "completed", "rejected"],
      default: "reported"
    }
  },
  {
    timestamps: true // Automatically handles createdAt and updatedAt
  }
);

// 2dsphere index for fast geospatial proximity queries and spatial clustering
issueSchema.index({ location: '2dsphere' });

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;
