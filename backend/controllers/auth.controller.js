const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { JWT_SECRET } = require("../middleware/auth.middleware");

// Helper to sign JWT tokens
const signToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Seed default admin account if none exists in MongoDB Atlas
 */
const ensureDefaultAdmin = async () => {
  try {
    const adminEmail = "admin@roadwise.in";
    const existing = await User.findOne({ email: adminEmail });

    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin@roadwise", salt);

      await User.create({
        name: "Municipal Road Supervisor",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log("✓ Default admin account initialized: admin@roadwise.in");
    }
  } catch (err) {
    console.warn("Notice checking default admin account:", err.message);
  }
};

// Run seed check on module load
ensureDefaultAdmin();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin user & get JWT token
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Missing credentials",
        message: "Please provide both email and password.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Ensure default admin exists if testing with standard credentials
    if (cleanEmail === "admin@roadwise.in") {
      await ensureDefaultAdmin();
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "No user found with this email address.",
      });
    }

    // Verify password (supports bcrypt hash and fallback)
    let isMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Incorrect password. Please verify and try again.",
      });
    }

    const token = signToken(user._id, user.role);

    return res.status(200).json({
      message: "Authentication successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Server error",
      message: "An error occurred during authentication. Please try again.",
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated admin user
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch profile",
      message: error.message,
    });
  }
};

module.exports = {
  login,
  getMe,
  ensureDefaultAdmin,
};
