import express from "express";
import { getLiveJobsList, getRecommendedJobs, calculateMatchScore } from "../controllers/job.controller.js";

const router = express.Router();

router.get("/live", getLiveJobsList);
router.post("/recommendations", getRecommendedJobs);
router.post("/match", calculateMatchScore);

export default router;
