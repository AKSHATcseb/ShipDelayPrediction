import express from 'express';
import { 
  getMilestones, createMilestone, updateMilestone, deleteMilestone 
} from '../controllers/milestoneController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/project/:projectId', protect, getMilestones);
router.post('/', protect, createMilestone);
router.put('/:milestoneId', protect, updateMilestone);
router.delete('/:milestoneId', protect, deleteMilestone);

export default router;
