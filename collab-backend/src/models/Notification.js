import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['assigned', 'mention', 'invite', 'project_update', 'activity_complete', 'risk_change'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Notification', NotificationSchema);
