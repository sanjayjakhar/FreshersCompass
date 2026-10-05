import express from "express";
import { aiInferenceLimiter } from "../middleware/rateLimiter.js";
import {
  analyzeRepository,
  analyzeRepositoryAsync,
  getIndexStatus,
  chatWithCodebase,
  getRecruiterPitch,
  getInterviewPrep,
  getUserRepositories,
  getRepositoryBranches,
  getRepositoryCommits,
  generateProfileReadme,
  generateProjectReadme,
} from "../controllers/github.controller.js";

const router = express.Router();

router.post("/analyze", aiInferenceLimiter, analyzeRepository);
router.post("/analyze-async", aiInferenceLimiter, analyzeRepositoryAsync);
router.get("/index-status/:jobId", getIndexStatus);
router.get("/branches", getRepositoryBranches);
router.get("/commits", getRepositoryCommits);
router.post("/chat", aiInferenceLimiter, chatWithCodebase);
router.post("/pitch", getRecruiterPitch);
router.post("/interview-prep", getInterviewPrep);
router.get("/user/:username/repos", getUserRepositories);
router.post("/profile-readme", generateProfileReadme);
router.post("/project-readme", generateProjectReadme);

export default router;


