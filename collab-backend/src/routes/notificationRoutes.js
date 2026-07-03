import express from 'express';
import { 
  getNotifications, markAsRead, markAllAsRead 
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:notificationId/read', protect, markAsRead);
router.put('/read/all', protect, markAllAsRead);

export default router;
