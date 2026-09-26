import rateLimit from "express-rate-limit";
import { getEffectiveUserId } from "./auth.middleware.js";

/**
 * Rate limiter for heavy file uploads (Resume parser)
 * 10 uploads per 15-minute sliding window per user session
 */
export const resumeUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getEffectiveUserId(req) || req.ip,
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many resume uploads. Please wait a few minutes before trying again.",
      error: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * Rate limiter for LLM inference and codebase vector indexing
 * 30 queries per 10-minute sliding window per user session
 */
export const aiInferenceLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getEffectiveUserId(req) || req.ip,
  handler: (req, res) => {
    return res.status(429).json({
      message: "AI inference rate limit reached for this session. Please wait a few minutes before submitting more requests.",
      error: "AI_RATE_LIMIT_EXCEEDED",
    });
  },
});
