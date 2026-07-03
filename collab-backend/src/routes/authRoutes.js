import express from 'express';
import { 
  register, login, getMe, inviteCollaborator, 
  acceptInvitation, rejectInvitation, removeCollaborator, 
  listCollaborators, getMyProjects 
} from '../controllers/authController.js';
import { protect, hasPermission } from '../middlewares/auth.js';
import { validateLogin, validateRegister } from '../middlewares/validator.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);

// Collaborator Management
router.post('/invite', protect, hasPermission('user.invite'), inviteCollaborator);
router.post('/remove', protect, hasPermission('user.remove'), removeCollaborator);
router.get('/projects/:projectId/collaborators', protect, hasPermission('project.read'), listCollaborators);
router.get('/projects', protect, getMyProjects);

// Invitations (Accept/Reject using link token, protect is required since user needs to be logged in to accept)
router.post('/invitations/accept/:token', protect, acceptInvitation);
router.post('/invitations/reject/:token', protect, rejectInvitation);

export default router;
