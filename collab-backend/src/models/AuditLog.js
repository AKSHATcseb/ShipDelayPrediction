import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fieldChanged: {
    type: String,
    required: true
  },
  oldValue: {
    type: String,
    default: ''
  },
  newValue: {
    type: String,
    default: ''
  },
  changeReason: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AuditLog', AuditLogSchema);
