import mongoose from 'mongoose';

const DependencySchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  sourceActivity: {
    type: String,
    required: true
  },
  destinationActivity: {
    type: String,
    required: true
  },
  dependencyType: {
    type: String,
    enum: ['Normal', 'Loop'],
    default: 'Normal'
  },
  loopFlag: {
    type: Boolean,
    default: false
  },
  loopConfiguration: {
    maxIterations: {
      type: Number,
      default: 5
    },
    expectedAvgIterations: {
      type: Number,
      default: 2
    },
    exitCondition: {
      type: String,
      default: 'QA Approved'
    },
    loopProbability: {
      type: Number,
      default: 0.3
    },
    isMandatory: {
      type: Boolean,
      default: false
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Dependency', DependencySchema);
