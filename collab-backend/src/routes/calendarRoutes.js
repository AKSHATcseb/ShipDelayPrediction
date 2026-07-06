import express from 'express';
import { 
  getEvents, createEvent, updateEvent, deleteEvent, 
  addEventComment, uploadEventAttachment, getHolidays, createHoliday
} from '../controllers/calendarController.js';
import { protect, hasPermission } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getEvents);
router.post('/', protect, createEvent);
router.put('/:eventId', protect, updateEvent);
router.delete('/:eventId', protect, deleteEvent);

router.post('/:eventId/comments', protect, addEventComment);
router.post('/:eventId/attachments', protect, uploadEventAttachment);

router.get('/holidays/list', protect, getHolidays);
router.post('/holidays', protect, createHoliday);

export default router;
