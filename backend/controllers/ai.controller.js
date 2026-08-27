const axios = require("axios");
const FormData = require("form-data");

/**
 * Predict road damage using FastAPI AI Service
 * Route: POST /api/ai/predict
 */
const predictDamage = async (req, res) => {
  try {
    // Extract file from req.file or req.files ('file' or 'image' field)
    const uploadedFile =
      req.file ||
      (req.files && (req.files.file?.[0] || req.files.image?.[0]));

    // 1. Validate that an image file was uploaded
    if (!uploadedFile) {
      return res.status(400).json({
        error: "No image file supplied. Please upload an image under the 'file' or 'image' field.",
      });
    }

    // 2. Prepare FormData payload for FastAPI
    const formData = new FormData();
    formData.append("file", uploadedFile.buffer, {
      filename: uploadedFile.originalname || "image.jpg",
      contentType: uploadedFile.mimetype || "image/jpeg",
    });

    // 3. Resolve AI service URL from environment variables
    const aiBaseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const aiPredictEndpoint = `${aiBaseUrl}/predict`;

    // 4. Forward request to FastAPI AI service
    const aiResponse = await axios.post(aiPredictEndpoint, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 second timeout for model inference
    });

    // 5. Return FastAPI response to client
    return res.status(200).json(aiResponse.data);

  } catch (error) {
    // Handle specific FastAPI connectivity and API errors
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        error: "AI Service unavailable. Ensure FastAPI server is running on port 8000.",
        details: error.message,
      });
    }

    if (error.response) {
      // FastAPI returned an error response status
      return res.status(error.response.status).json({
        error: "AI Service returned an error.",
        details: error.response.data,
      });
    }

    // Generic server error fallback
    return res.status(500).json({
      error: "Internal server error while processing AI prediction.",
      message: error.message,
    });
  }
};

module.exports = {
  predictDamage,
};
