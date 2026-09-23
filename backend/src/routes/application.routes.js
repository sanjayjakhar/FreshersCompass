import express from 'express';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  seedDemoApplications,
  resetApplications,
} from '../controllers/application.controller.js';

const router = express.Router();

router.get('/', getApplications);
router.post('/', createApplication);
router.post('/seed-demo', seedDemoApplications);
router.post('/reset', resetApplications);
router.patch('/:id', updateApplication);
router.delete('/:id', deleteApplication);

export default router;
