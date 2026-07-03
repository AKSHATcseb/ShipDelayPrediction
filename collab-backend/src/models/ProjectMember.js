import mongoose from 'mongoose';

const ProjectMemberSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['PROJECT_MANAGER', 'VIEWER'],
    required: true
  },
  permissions: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Removed'],
    default: 'Active'
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique key to avoid duplicate memberships
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ProjectMember', ProjectMemberSchema);
