import express from 'express';
import { 
  getUsers, createUser, updateUser, deleteUser, resetUserPassword 
} from '../controllers/userController.js';
import { protect, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// All userRoutes are strictly Project Manager-only
router.use(protect);
router.use(requireRole('PROJECT_MANAGER', 'ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetUserPassword);

export default router;
