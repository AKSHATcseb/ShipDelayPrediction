import mongoose from 'mongoose';

const DocumentVersionSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  filename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  versions: [DocumentVersionSchema]
}, {
  timestamps: true
});

export default mongoose.model('Document', DocumentSchema);
