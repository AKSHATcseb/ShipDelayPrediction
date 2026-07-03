import mongoose from 'mongoose';

const ActivityTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    default: 'Other'
  },
  sequenceNumber: {
    type: Number,
    required: true
  },
  parallelGroup: {
    type: Number
  },
  dependencyList: {
    type: [Number], // sequence numbers of activities this activity depends on
    default: []
  },
  durationMonths: {
    type: Number,
    default: 1.0
  },
  historicalRiskWeight: {
    type: Number,
    default: 50.0
  },
  responsibleDepartment: {
    type: String,
    trim: true
  },
  isMilestone: {
    type: Boolean,
    default: false
  },
  isCriticalPath: {
    type: Boolean,
    default: false
  }
});

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  activities: {
    type: [ActivityTemplateSchema],
    default: []
  },
  feedbackLoops: {
    type: [Object],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Template', TemplateSchema);
