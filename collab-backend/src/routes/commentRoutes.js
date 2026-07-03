import express from 'express';
import { 
  getComments, createComment, deleteComment 
} from '../controllers/commentController.js';
import { protect, hasPermission } from '../middlewares/auth.js';
import { validateComment } from '../middlewares/validator.js';

const router = express.Router();

router.get('/project/:projectId', protect, hasPermission('project.read'), getComments);
router.post('/', protect, hasPermission('comment.create'), validateComment, createComment);
router.delete('/:commentId', protect, hasPermission('comment.delete'), deleteComment);

export default router;
