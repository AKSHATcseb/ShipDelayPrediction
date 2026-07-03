import express from 'express';
import { 
  listDocuments, uploadDocument, uploadNewVersion, deleteDocument, listAllDocuments 
} from '../controllers/documentController.js';
import { protect, hasPermission } from '../middlewares/auth.js';

const router = express.Router();

router.get('/all', protect, listAllDocuments);
router.get('/project/:projectId', protect, hasPermission('project.read'), listDocuments);
router.post('/project/:projectId', protect, hasPermission('file.upload'), uploadDocument);
router.post('/:documentId/version', protect, hasPermission('file.upload'), uploadNewVersion);
router.delete('/:documentId', protect, hasPermission('file.delete'), deleteDocument);

export default router;
