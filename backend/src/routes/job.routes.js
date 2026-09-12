import express from "express";
import { getLiveJobsList, getRecommendedJobs } from "../controllers/job.controller.js";

const router = express.Router();

router.get("/live", getLiveJobsList);
router.post("/recommendations", getRecommendedJobs);

export default router;
