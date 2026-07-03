import Document from '../models/Document.js';

export const listDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { activityId } = req.query;
    
    const query = { projectId };
    if (activityId) {
      query.activityId = activityId;
    }

    const docs = await Document.find(query)
      .populate('uploaderId', 'name email')
      .populate('versions.uploaderId', 'name email')
      .sort({ updatedAt: -1 });

    return res.json(docs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list documents', error: error.message });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { activityId, filename, mimetype, base64Data } = req.body;
    if (!filename || !mimetype) {
      return res.status(400).json({ message: 'Filename and mimetype are required' });
    }

    // Since we are running in multiple environments, we store base64 string or a mock filepath
    // in MongoDB to ensure zero-dependency diskless file upload which is extremely robust.
    const filepath = base64Data || `uploads/mock_${Date.now()}_${filename}`;

    const document = await Document.create({
      projectId,
      activityId: activityId || null,
      filename,
      filepath,
      mimetype,
      uploaderId: req.user._id,
      version: 1,
      versions: [{
        version: 1,
        filepath,
        uploaderId: req.user._id,
        timestamp: new Date()
      }]
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('uploaderId', 'name email');

    // Broadcast file addition to project room
    global.io?.to(projectId.toString()).emit('document-added', populatedDoc);

    return res.status(201).json(populatedDoc);
  } catch (error) {
    console.error('Document upload error details:', error);
    return res.status(500).json({ message: 'Failed to upload document', error: error.message });
  }
};

export const uploadNewVersion = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { base64Data, filename } = req.body;

    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const newVersionNum = doc.version + 1;
    const filepath = base64Data || `uploads/mock_${Date.now()}_v${newVersionNum}_${filename || doc.filename}`;

    doc.version = newVersionNum;
    doc.filepath = filepath;
    doc.versions.push({
      version: newVersionNum,
      filepath,
      uploaderId: req.user._id,
      timestamp: new Date()
    });

    await doc.save();

    const populatedDoc = await Document.findById(documentId)
      .populate('uploaderId', 'name email')
      .populate('versions.uploaderId', 'name email');

    // Broadcast new version event
    global.io?.to(doc.projectId.toString()).emit('document-version-added', populatedDoc);

    return res.json(populatedDoc);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload new version', error: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only owner of doc or project manager can delete
    if (doc.uploaderId.toString() !== req.user._id.toString() && req.projectRole !== 'PROJECT_MANAGER') {
      return res.status(403).json({ message: 'Access denied: Cannot delete other user\'s document' });
    }

    await Document.findByIdAndDelete(documentId);

    // Broadcast delete event
    global.io?.to(doc.projectId.toString()).emit('document-deleted', { documentId });

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete document', error: error.message });
  }
};

export const listAllDocuments = async (req, res) => {
  try {
    const docs = await Document.find()
      .populate('projectId', 'projectName projectIdCode shipName shipClass')
      .populate('uploaderId', 'name email')
      .populate('versions.uploaderId', 'name email')
      .sort({ updatedAt: -1 });

    return res.json(docs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list all documents', error: error.message });
  }
};
