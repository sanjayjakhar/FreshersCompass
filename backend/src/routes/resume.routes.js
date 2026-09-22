import express from 'express';
import { upload } from '../middleware/upload.middleware.js';
import {
  uploadResume,
  getLatestResume,
  saveDemoResume,
  deleteResume,
} from '../controllers/resume.controller.js';

const router = express.Router();

// Upload resume and persist to MongoDB
router.post('/upload', upload.single('resume'), uploadResume);

// Fetch latest resume from MongoDB
router.get('/latest', getLatestResume);

// Seed or update demo candidate resume in MongoDB
router.post('/demo', saveDemoResume);

// Clear resume from MongoDB
router.delete('/', deleteResume);

export default router;
