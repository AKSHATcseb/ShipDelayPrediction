import express from 'express';
import { 
  getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate 
} from '../controllers/templateController.js';
import { protect, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Fetch templates is allowed for both Project Manager and Viewer
router.get('/', protect, requireRole('PROJECT_MANAGER', 'VIEWER'), getTemplates);
router.get('/:id', protect, requireRole('PROJECT_MANAGER', 'VIEWER'), getTemplateById);

// Template modification routes are allowed for PROJECT_MANAGER
router.post('/', protect, requireRole('PROJECT_MANAGER'), createTemplate);
router.put('/:id', protect, requireRole('PROJECT_MANAGER'), updateTemplate);
router.delete('/:id', protect, requireRole('PROJECT_MANAGER'), deleteTemplate);

export default router;
