import express from 'express';
import {
  getProfile,
  updateProfile,
  getPublicProfile,
  getVerificationBadge,
  getReadinessTelemetry,
  recordReadinessSnapshot,
} from '../controllers/profile.controller.js';

const router = express.Router();

// Public unauthenticated route for shared portfolio preview
router.get('/public/:username', getPublicProfile);
router.get('/badge/:username', getVerificationBadge);

// Readiness radar telemetry (#58)
router.get('/readiness', getReadinessTelemetry);
router.post('/readiness/snapshot', recordReadinessSnapshot);

router.get('/', getProfile);
router.post('/', updateProfile);

export default router;