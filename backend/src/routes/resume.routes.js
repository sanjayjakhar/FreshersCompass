import express from 'express';
import { upload, validateResumeMagicBytes } from '../middleware/upload.middleware.js';
import { resumeUploadLimiter } from '../middleware/rateLimiter.js';
import {
  uploadResume,
  getLatestResume,
  saveDemoResume,
  deleteResume,
} from '../controllers/resume.controller.js';

const router = express.Router();

// Upload resume and persist to MongoDB (validated with strict magic bytes and rate limit)
router.post('/upload', resumeUploadLimiter, upload.single('resume'), validateResumeMagicBytes, uploadResume);


// Fetch latest resume from MongoDB
router.get('/latest', getLatestResume);

// Seed or update demo candidate resume in MongoDB
router.post('/demo', saveDemoResume);

// Clear resume from MongoDB
router.delete('/', deleteResume);

export default router;
