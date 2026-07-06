import mongoose from 'mongoose';

const MilestoneSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  relatedActivities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    }
  ],
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Overdue'],
    default: 'Pending'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  color: {
    type: String,
    default: '#D97706'
  },
  icon: {
    type: String,
    default: 'Flag'
  }
}, {
  timestamps: true
});

export default mongoose.model('Milestone', MilestoneSchema);
