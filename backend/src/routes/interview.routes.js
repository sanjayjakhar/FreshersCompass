import express from 'express';
import { evaluateInterview } from '../controllers/interview.controller.js';
import { aiInferenceLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/evaluate', aiInferenceLimiter, evaluateInterview);

export default router;
