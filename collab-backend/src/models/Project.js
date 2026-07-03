import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  projectIdCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shipName: {
    type: String,
    trim: true
  },
  shipClass: {
    type: String,
    trim: true
  },
  shipType: {
    type: String,
    required: true,
    default: 'Submarine'
  },
  projectCost: {
    type: Number,
    default: 5000.0
  },
  customer: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  expectedEndDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  currentStatus: {
    type: String,
    enum: ['Active', 'Completed', 'OnHold'],
    default: 'Active'
  },
  overallProgress: {
    type: Number,
    default: 0.0,
    min: 0,
    max: 100
  },
  predictedDelayPct: {
    type: Number,
    default: 0.0
  },
  predictedDelayMonths: {
    type: Number,
    default: 0.0
  },
  predictedRiskCategory: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low'
  },
  predictionConfidence: {
    type: Number,
    default: 85.0
  },
  feedbackLoops: {
    type: [Object],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model('Project', ProjectSchema);
