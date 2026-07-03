import express from 'express';
import { 
  getActivities, createActivity, updateActivity, 
  getActivityTimeline, getProjectTimeline 
} from '../controllers/activityController.js';
import { protect, hasPermission } from '../middlewares/auth.js';
import { validateActivityUpdate } from '../middlewares/validator.js';

const router = express.Router();

router.get('/project/:projectId', protect, hasPermission('project.read'), getActivities);
router.post('/project/:projectId', protect, hasPermission('activity.create'), createActivity);
router.put('/:activityId', protect, hasPermission('activity.update'), validateActivityUpdate, updateActivity);

// Timeline logs
router.get('/:activityId/timeline', protect, hasPermission('project.read'), getActivityTimeline);
router.get('/project/:projectId/timeline', protect, hasPermission('project.read'), getProjectTimeline);

export default router;
