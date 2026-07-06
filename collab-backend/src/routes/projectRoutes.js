import express from 'express';
import { 
  createProject, getProjectDetails, updateProject, deleteProject,
  getProjectPdfReport, getProjectExcelReport,
  getProjectMembers, inviteProjectCollaborator, removeProjectMember, acceptProjectInvitation
} from '../controllers/projectController.js';
import {
  getProjectWorkflow, createProjectLoop, updateProjectLoop, deleteProjectLoop
} from '../controllers/loopController.js';
import { protect, hasPermission } from '../middlewares/auth.js';
import { validateProject } from '../middlewares/validator.js';

const router = express.Router();

// Direct direct direct accept (mounted before ID routes to avoid parsing conflict)
router.post('/invitations/accept', protect, acceptProjectInvitation);

router.post('/', protect, validateProject, createProject);
router.get('/:projectId', protect, hasPermission('project.read'), getProjectDetails);
router.put('/:projectId', protect, hasPermission('project.update'), validateProject, updateProject);
router.delete('/:projectId', protect, hasPermission('project.delete'), deleteProject);

// Workflow graph visualization
router.get('/:projectId/workflow', protect, hasPermission('project.read'), getProjectWorkflow);

// Executive report exports
router.get('/:projectId/reports/pdf', protect, hasPermission('project.read'), getProjectPdfReport);
router.get('/:projectId/reports/excel', protect, hasPermission('project.read'), getProjectExcelReport);

// Loop endpoints
router.post('/:projectId/loops', protect, hasPermission('project.update'), createProjectLoop);
router.put('/:projectId/loops/:loopId', protect, hasPermission('project.update'), updateProjectLoop);
router.delete('/:projectId/loops/:loopId', protect, hasPermission('project.update'), deleteProjectLoop);

// Collaborator Management
router.get('/:projectId/members', protect, hasPermission('project.read'), getProjectMembers);
router.post('/:projectId/invite', protect, hasPermission('project.update'), inviteProjectCollaborator);
router.delete('/:projectId/members/:targetUserId', protect, hasPermission('project.update'), removeProjectMember);

export default router;

