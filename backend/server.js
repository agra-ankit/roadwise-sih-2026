const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const app = express();
connectDB()
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "RoadWise Backend is running!"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`RoadWise backend running on port ${PORT}`);
});