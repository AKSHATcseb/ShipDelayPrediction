import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: true,
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
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Activity',
    default: []
  },
  plannedStartDate: {
    type: Date
  },
  plannedEndDate: {
    type: Date
  },
  actualStartDate: {
    type: Date
  },
  actualEndDate: {
    type: Date
  },
  currentStatus: {
    type: String,
    enum: ['NotStarted', 'InProgress', 'Completed', 'Delayed', 'Blocked', 'Cancelled'],
    default: 'NotStarted'
  },
  completionPercentage: {
    type: Number,
    default: 0.0,
    min: 0,
    max: 100
  },
  durationMonths: {
    type: Number,
    default: 1.0
  },
  remainingMonths: {
    type: Number,
    default: 1.0
  },
  currentDelayDays: {
    type: Number,
    default: 0
  },
  historicalRiskWeight: {
    type: Number,
    default: 50.0
  },
  predictedRisk: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low'
  },
  isMilestone: {
    type: Boolean,
    default: false
  },
  isCriticalPath: {
    type: Boolean,
    default: false
  },
  assignedDepartment: {
    type: String
  },
  assignedOfficer: {
    type: String
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

// Enable optimistic concurrency control (built-in optimistic locking)
ActivitySchema.set('optimisticConcurrency', true);

export default mongoose.model('Activity', ActivitySchema);
