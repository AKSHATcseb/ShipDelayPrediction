import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
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
  content: {
    type: String,
    required: true,
    trim: true
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Comment', CommentSchema);
