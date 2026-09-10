import express from 'express';
import { upload } from '../middleware/upload.middleware.js';
import { uploadResume } from '../controllers/resume.controller.js';

const router = express.Router();

// Upload a resume and return the parsed ATS data
router.post('/upload', upload.single('resume'), uploadResume);

export default router;
