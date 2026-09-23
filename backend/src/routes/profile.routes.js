import express from 'express';
import { getProfile, updateProfile, getPublicProfile } from '../controllers/profile.controller.js';

const router = express.Router();

// Public unauthenticated route for shared portfolio preview
router.get('/public/:username', getPublicProfile);

router.get('/', getProfile);
router.post('/', updateProfile);

export default router;
