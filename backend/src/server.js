import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import multer from "multer";
import sanitizeInput from "./middleware/sanitize.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(express.json());
app.use(sanitizeInput);
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ---------- Health check ----------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "freshercompass-backend" });
});

// ---------- Routes ----------
import authRoutes from "./routes/auth.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import githubRoutes from "./routes/github.routes.js";
import jobRoutes from "./routes/job.routes.js";
import linkedinRoutes from "./routes/linkedin.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import profileRoutes from "./routes/profile.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/profile", profileRoutes);

// ---------- 404 & Global Error Handler ----------
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size exceeds limit (maximum 5MB allowed)",
        error: err.message,
      });
    }
    return res.status(400).json({ message: "File upload error", error: err.message });
  }

  if (err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }

  console.error("Unhandled Server Error:", err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { details: err.stack }),
  });
});

// ---------- Database connection ----------
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/FreshersCompass";
mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: true,
  })
  .then(() => console.log("MongoDB connected successfully to:", mongoUri))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
