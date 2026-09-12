import express from "express";
import {
  optimizeLinkedInProfile,
  fetchLinkedInProfile,
  generateLaunchPost,
  generateColdOutreach,
} from "../controllers/linkedin.controller.js";

const router = express.Router();

router.post("/optimize", optimizeLinkedInProfile);
router.post("/fetch-profile", fetchLinkedInProfile);
router.post("/launch-post", generateLaunchPost);
router.post("/cold-outreach", generateColdOutreach);

export default router;

