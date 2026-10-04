import express from 'express';
import { evaluateInterview, generateInterviewQuestions } from '../controllers/interview.controller.js';
import { aiInferenceLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/generate-questions', aiInferenceLimiter, generateInterviewQuestions);
router.post('/evaluate', aiInferenceLimiter, evaluateInterview);

export default router;
