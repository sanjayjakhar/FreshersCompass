import express from 'express';
import { upload, validateResumeMagicBytes } from '../middleware/upload.middleware.js';
import { resumeUploadLimiter } from '../middleware/rateLimiter.js';
import {
  uploadResume,
  getLatestResume,
  getAllResumeVersions,
  getResumeById,
  saveDemoResume,
  deleteResumeVersion,
  deleteResume,
} from '../controllers/resume.controller.js';

const router = express.Router();

// Upload resume and persist to MongoDB (validated with strict magic bytes and rate limit)
router.post('/upload', resumeUploadLimiter, upload.single('resume'), validateResumeMagicBytes, uploadResume);

// Fetch all resume versions for user
router.get('/versions', getAllResumeVersions);

// Fetch latest resume from MongoDB
router.get('/latest', getLatestResume);

// Seed or update demo candidate resume in MongoDB
router.post('/demo', saveDemoResume);

// Fetch specific resume version by ID
router.get('/:id', getResumeById);

// Delete specific resume version by ID
router.delete('/:id', deleteResumeVersion);

// Clear all resumes from MongoDB
router.delete('/', deleteResume);

export default router;
