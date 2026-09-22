import express from "express";
import {
  analyzeRepository,
  chatWithCodebase,
  getRecruiterPitch,
  getInterviewPrep,
  getUserRepositories,
  generateProfileReadme,
  generateProjectReadme,
} from "../controllers/github.controller.js";

const router = express.Router();

router.post("/analyze", analyzeRepository);
router.post("/chat", chatWithCodebase);
router.post("/pitch", getRecruiterPitch);
router.post("/interview-prep", getInterviewPrep);
router.get("/user/:username/repos", getUserRepositories);
router.post("/profile-readme", generateProfileReadme);
router.post("/project-readme", generateProjectReadme);

export default router;

