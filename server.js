const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("./config/db");
connectDB()
// =====================================================
// MODELS
// =====================================================

const Report = require("./models/report.model");
const User = require("./models/user.model");
const Assignment = require("./models/assignment.model");
const Verification = require("./models/verification.model");

// =====================================================
// APP SETUP
// =====================================================

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// MONGODB CONNECTION
// =====================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RoadWise Backend is running!"
  });
});

// =====================================================
// CITIZEN APIs
// =====================================================

/*
  1. CREATE ROAD DAMAGE REPORT

  POST /api/reports

  Expected body:

  {
    "userId": "USER_MONGODB_ID",
    "imageUrl": "https://example.com/image.jpg",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "Near college gate",
    "damageType": "pothole",
    "severity": "high",
    "confidence": 0.93,
    "priorityScore": 90,
    "description": "Large pothole on road"
  }
*/

app.post("/reports", async (req, res) => {
  try {
    const {
      userId,
      imageUrl,
      latitude,
      longitude,
      address,
      damageType,
      severity,
      confidence,
      priorityScore,
      description
    } = req.body;

    // Required fields
    if (
      !userId ||
      !imageUrl ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "userId, imageUrl, latitude and longitude are required"
      });
    }

    // Check whether user exists
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Create report
    const report = await Report.create({
      userId,

      imageUrl,

      location: {
        type: "Point",
        coordinates: [
          Number(longitude),
          Number(latitude)
        ]
      },

      address: address || "",

      // Temporary defaults.
      // Later FastAPI/YOLO will provide these.
      damageType: damageType || "other",
      severity: severity || "low",

      confidence:
        confidence !== undefined ? confidence : 0,

      priorityScore:
        priorityScore !== undefined ? priorityScore : 0,

      status: "reported",

      assignedTo: null,

      description: description || ""
    });

    console.log("New report created:", report._id);

    res.status(201).json({
      success: true,
      message: "Road damage report submitted successfully",
      report
    });

  } catch (error) {
    console.error("Create report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create report",
      error: error.message
    });
  }
});


// =====================================================
// 2. GET CITIZEN'S REPORTS
// =====================================================

/*
  GET /api/reports/my?userId=USER_ID
*/

app.get("/reports/my", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const reports = await Report.find({
      userId
    })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {
    console.error("Get citizen reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reports"
    });
  }
});


// =====================================================
// 3. GET ONE REPORT
// =====================================================

/*
  GET /api/reports/:id
*/

app.get("/reports/:id", async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("userId", "name email")
      .populate("assignedTo", "name email");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error("Get report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch report"
    });
  }
});


// =====================================================
// ADMIN APIs
// =====================================================

// =====================================================
// 4. GET ALL REPORTS
// =====================================================

/*
  GET /api/admin/reports
*/

app.get("/admin/reports", async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("userId", "name email")
      .populate("assignedTo", "name email")
      .sort({ priorityScore: -1, createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {
    console.error("Admin reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reports"
    });
  }
});


// =====================================================
// 5. ADMIN DASHBOARD STATISTICS
// =====================================================

/*
  GET /api/admin/dashboard
*/

app.get("/admin/dashboard", async (req, res) => {
  try {

    const totalReports =
      await Report.countDocuments();

    const reported =
      await Report.countDocuments({
        status: "reported"
      });

    const assigned =
      await Report.countDocuments({
        status: "assigned"
      });

    const inProgress =
      await Report.countDocuments({
        status: "in_progress"
      });

    const completed =
      await Report.countDocuments({
        status: "completed"
      });

    const verified =
      await Report.countDocuments({
        status: "verified"
      });

    const rejected =
      await Report.countDocuments({
        status: "rejected"
      });

    const highSeverity =
      await Report.countDocuments({
        severity: "high"
      });

    res.json({
      success: true,

      stats: {
        totalReports,
        reported,
        assigned,
        inProgress,
        completed,
        verified,
        rejected,
        highSeverity
      }
    });

  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard"
    });
  }
});


// =====================================================
// 6. HIGH PRIORITY REPORTS
// =====================================================

/*
  GET /api/admin/reports/priority
*/

app.get("/admin/reports/priority", async (req, res) => {
  try {

    const reports = await Report.find({
      priorityScore: {
        $gte: 70
      }
    })
      .populate("userId", "name email")
      .populate("assignedTo", "name email")
      .sort({
        priorityScore: -1
      });

    res.json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {
    console.error("Priority reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch priority reports"
    });
  }
});


// =====================================================
// 7. UPDATE REPORT STATUS
// =====================================================

/*
  PUT /api/admin/reports/:id/status

  Body:

  {
    "status": "in_progress"
  }
*/

app.put("/admin/reports/:id/status", async (req, res) => {
  try {

    const { status } = req.body;

    const allowedStatuses = [
      "reported",
      "verified",
      "assigned",
      "in_progress",
      "completed",
      "rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const report =
      await Report.findByIdAndUpdate(
        req.params.id,
        {
          status
        },
        {
          new: true,
          runValidators: true
        }
      );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    res.json({
      success: true,
      message: "Report status updated successfully",
      report
    });

  } catch (error) {
    console.error("Status update error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update status"
    });
  }
});


// =====================================================
// 8. ASSIGN REPAIR WORKER
// =====================================================

/*
  PUT /api/admin/reports/:id/assign

  Body:

  {
    "assignedTo": "WORKER_USER_ID",
    "assignedBy": "ADMIN_USER_ID"
  }
*/

app.put("/admin/reports/:id/assign", async (req, res) => {
  try {

    const {
      assignedTo,
      assignedBy
    } = req.body;

    if (!assignedTo || !assignedBy) {
      return res.status(400).json({
        success: false,
        message:
          "assignedTo and assignedBy are required"
      });
    }

    // Check worker
    const worker = await User.findById(assignedTo);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Assigned worker not found"
      });
    }

    // Check admin
    const admin = await User.findById(assignedBy);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
    }

    // Check report
    const report = await Report.findById(
      req.params.id
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    // Update report
    report.assignedTo = assignedTo;
    report.status = "assigned";

    await report.save();

    // Create assignment record
    const assignment =
      await Assignment.create({
        reportId: report._id,
        assignedTo,
        assignedBy,
        status: "assigned"
      });

    res.json({
      success: true,
      message: "Repair assigned successfully",
      report,
      assignment
    });

  } catch (error) {
    console.error("Assignment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to assign repair",
      error: error.message
    });
  }
});


// =====================================================
// 9. MARK REPAIR AS IN PROGRESS
// =====================================================

/*
  PUT /api/admin/reports/:id/in-progress
*/

app.put(
  "/admin/reports/:id/in-progress",
  async (req, res) => {

    try {

      const report =
        await Report.findByIdAndUpdate(
          req.params.id,
          {
            status: "in_progress"
          },
          {
            new: true
          }
        );

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Report not found"
        });
      }

      // Update latest assignment
      await Assignment.findOneAndUpdate(
        {
          reportId: report._id
        },
        {
          status: "in_progress"
        },
        {
          sort: {
            createdAt: -1
          }
        }
      );

      res.json({
        success: true,
        message: "Repair marked as in progress",
        report
      });

    } catch (error) {

      console.error(
        "In-progress update error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to update repair"
      });
    }
  }
);


// =====================================================
// 10. MARK REPAIR COMPLETED
// =====================================================

/*
  PUT /api/admin/reports/:id/complete

  Body:

  {
    "completionImageUrl": "https://..."
  }
*/

app.put(
  "/admin/reports/:id/complete",
  async (req, res) => {

    try {

      const {
        completionImageUrl
      } = req.body;

      if (!completionImageUrl) {
        return res.status(400).json({
          success: false,
          message:
            "completionImageUrl is required"
        });
      }

      const assignment =
        await Assignment.findOne({
          reportId: req.params.id
        }).sort({
          createdAt: -1
        });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message:
            "Assignment not found"
        });
      }

      assignment.status = "completed";
      assignment.completedAt = new Date();
      assignment.completionImageUrl =
        completionImageUrl;

      await assignment.save();

      const report =
        await Report.findByIdAndUpdate(
          req.params.id,
          {
            status: "completed"
          },
          {
            new: true
          }
        );

      res.json({
        success: true,
        message:
          "Repair marked as completed",
        report,
        assignment
      });

    } catch (error) {

      console.error(
        "Completion error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to mark repair as completed"
      });
    }
  }
);


// =====================================================
// 11. VERIFY COMPLETED REPAIR
// =====================================================

/*
  POST /api/admin/reports/:id/verify

  Body:

  {
    "verifiedBy": "ADMIN_USER_ID",
    "imageUrl": "https://...",
    "result": "approved",
    "remarks": "Repair verified successfully"
  }
*/

app.post(
  "/admin/reports/:id/verify",
  async (req, res) => {

    try {

      const {
        verifiedBy,
        imageUrl,
        result,
        remarks
      } = req.body;

      if (
        !verifiedBy ||
        !imageUrl ||
        !result
      ) {
        return res.status(400).json({
          success: false,
          message:
            "verifiedBy, imageUrl and result are required"
        });
      }

      if (
        !["approved", "rejected"].includes(result)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Result must be approved or rejected"
        });
      }

      const report =
        await Report.findById(
          req.params.id
        );

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Report not found"
        });
      }

      // Create verification record
      const verification =
        await Verification.create({
          reportId: report._id,
          imageUrl,
          verifiedBy,
          result,
          remarks: remarks || ""
        });

      // Update report status
      report.status =
        result === "approved"
          ? "verified"
          : "rejected";

      await report.save();

      res.json({
        success: true,
        message:
          "Repair verification completed",
        verification,
        report
      });

    } catch (error) {

      console.error(
        "Verification error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to verify repair",
        error: error.message
      });
    }
  }
);


// =====================================================
// AI API
// =====================================================

/*
  12. TEMPORARY AI ANALYSIS API

  POST /api/analyze

  Later:
  Node.js → FastAPI → YOLO
*/

app.post("/analyze", async (req, res) => {

  try {

    const {
      imageUrl
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "imageUrl is required"
      });
    }

    /*
      TEMPORARY RESPONSE

      Later this will become:

      Node.js
          ↓
      FastAPI
          ↓
      YOLO
          ↓
      damageType
      severity
      confidence
      priorityScore
    */

    const aiResult = {
      damageType: "pothole",
      severity: "high",
      confidence: 0.93,
      priorityScore: 90
    };

    res.json({
      success: true,
      message: "AI analysis completed",
      result: aiResult
    });

  } catch (error) {

    console.error(
      "AI analysis error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "AI analysis failed"
    });
  }
});


// =====================================================
// AUTH APIs
// =====================================================

// =====================================================
// 13. CITIZEN REGISTRATION
// =====================================================

/*
  POST /api/auth/register

  Body:

  {
    "name": "Pawan",
    "email": "pawan@gmail.com",
    "password": "123456"
  }
*/

app.post(
  "/auth/register",
  async (req, res) => {

    try {

      const {
        name,
        email,
        password
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required"
        });
      }

      const existingUser =
        await User.findOne({
          email: email.toLowerCase()
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "User with this email already exists"
        });
      }

      const user =
        await User.create({
          name,
          email: email.toLowerCase(),
          password,
          role: "user"
        });

      res.status(201).json({
        success: true,
        message:
          "User registered successfully",

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {

      console.error(
        "Registration error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to register user"
      });
    }
  }
);


// =====================================================
// 14. LOGIN
// =====================================================

/*
  POST /api/auth/login

  Body:

  {
    "email": "user@gmail.com",
    "password": "123456"
  }
*/

app.post(
  "/auth/login",
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email and password are required"
        });
      }

      const user =
        await User.findOne({
          email: email.toLowerCase()
        });

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password"
        });
      }

      // Temporary password comparison.
      // Later use bcrypt.
      if (user.password !== password) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password"
        });
      }

      res.json({
        success: true,
        message: "Login successful",

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Login failed"
      });
    }
  }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `RoadWise backend running on port ${PORT}`
  );
});