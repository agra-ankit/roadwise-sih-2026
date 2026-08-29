const mongoose = require("mongoose");
const Issue = require("../models/issue.model");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");

    // Explicitly build and verify Issue 2dsphere index before accepting requests
    await Issue.createIndexes();
    console.log("Issue 2dsphere geospatial index initialized successfully!");
  } catch (error) {
    console.error("MongoDB connection or index initialization failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;