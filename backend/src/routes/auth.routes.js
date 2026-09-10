import express from 'express';
import { githubAuthCallback, logout, me } from '../controllers/auth.controller.js';

const router = express.Router();

// Mock route to simulate GitHub OAuth callback for now
router.get('/github/callback', githubAuthCallback);

router.post('/logout', logout);
router.get('/me', me); // Requires auth middleware

export default router;
