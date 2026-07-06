import express from 'express';
import { 
  getReminders, createReminder, deleteReminder 
} from '../controllers/reminderController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getReminders);
router.post('/', protect, createReminder);
router.delete('/:reminderId', protect, deleteReminder);

export default router;
