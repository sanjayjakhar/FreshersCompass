import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(express.json());
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

// ---------- Routes (to be added) ----------
// import authRoutes from "./routes/auth.routes.js";
// import resumeRoutes from "./routes/resume.routes.js";
// import applicationRoutes from "./routes/application.routes.js";
// app.use("/api/auth", authRoutes);
// app.use("/api/resume", resumeRoutes);
// app.use("/api/applications", applicationRoutes);

// ---------- Database connection ----------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
