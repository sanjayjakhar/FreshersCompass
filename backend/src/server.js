import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import multer from "multer";
import axios from "axios";
import sanitizeInput from "./middleware/sanitize.js";
import { sessionIsolationMiddleware } from "./middleware/auth.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
// 1. Helmet HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "https:"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// 2. CORS mounted early so browser OPTIONS preflights succeed before parsing/session middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "X-Hub-Signature-256",
      "X-GitHub-Event",
      "X-GitHub-Delivery",
    ],
  })
);

app.use(
  express.json({
    verify: (req, _res, buf, encoding) => {
      if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || "utf8");
      }
    },
  })
);
app.use(sanitizeInput);
app.use(cookieParser());
app.use(sessionIsolationMiddleware);
app.use(morgan("dev"));


// ---------- Health check & AI Diagnostics ----------
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "freshercompass-backend",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/health/diagnostics", async (req, res) => {
  const start = Date.now();
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
  let aiStatus = "offline";
  let aiLatency = null;

  try {
    const aiResp = await axios.get(`${aiServiceUrl}/health`, { timeout: 4000 });
    aiLatency = Date.now() - start;
    aiStatus = aiResp.data?.status === "ok" ? "healthy" : "degraded";
  } catch (err) {
    aiStatus = "offline";
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    backend: {
      status: "healthy",
      uptimeSeconds: Math.floor(process.uptime()),
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
    aiService: {
      status: aiStatus,
      latencyMs: aiLatency,
      models: {
        primary: "Google Gemini (gemini-1.5-flash / gemini-2.0-flash)",
        fallback: "Groq Cloud (llama-3.3-70b-versatile / llama-3.1-8b-instant)",
        offlineFallback: "Deterministic Heuristic Parsing Engine",
      },
    },
  });
});


app.get("/api/llm/status", async (req, res) => {
  // Provider breaker state drives the "Offline Mode Active" badge. A failure
  // here must not block the page: report "unknown" so the badge stays hidden
  // rather than claiming an outage we could not confirm.
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
  try {
    const aiResp = await axios.get(`${aiServiceUrl}/llm/status`, { timeout: 4000 });
    return res.json({ status: "ok", ...aiResp.data?.data });
  } catch (err) {
    return res.json({ status: "unknown", offline_mode: false, providers: [] });
  }
});


// ---------- Routes ----------
import authRoutes from "./routes/auth.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import githubRoutes from "./routes/github.routes.js";
import jobRoutes from "./routes/job.routes.js";
import linkedinRoutes from "./routes/linkedin.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import interviewRoutes from "./routes/interview.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/interview", interviewRoutes);


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
