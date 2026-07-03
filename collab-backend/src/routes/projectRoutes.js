import express from 'express';
import { 
  createProject, getProjectDetails, updateProject, deleteProject,
  getProjectPdfReport, getProjectExcelReport
} from '../controllers/projectController.js';
import { protect, hasPermission } from '../middlewares/auth.js';
import { validateProject } from '../middlewares/validator.js';

const router = express.Router();

router.post('/', protect, validateProject, createProject);
router.get('/:projectId', protect, hasPermission('project.read'), getProjectDetails);
router.put('/:projectId', protect, hasPermission('project.update'), validateProject, updateProject);
router.delete('/:projectId', protect, hasPermission('project.delete'), deleteProject);

// Executive report exports
router.get('/:projectId/reports/pdf', protect, hasPermission('project.read'), getProjectPdfReport);
router.get('/:projectId/reports/excel', protect, hasPermission('project.read'), getProjectExcelReport);

export default router;
