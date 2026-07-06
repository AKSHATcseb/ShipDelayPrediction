import mongoose from 'mongoose';

const CalendarEventSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    index: true
  },
  milestoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Overdue'],
    default: 'Pending'
  },
  category: {
    type: String,
    enum: [
      'Project', 'Milestone', 'Meeting', 'Reminder', 'Deadline', 
      'Activity', 'Critical Activity', 'Risk Review', 'Inspection', 
      'Approval', 'Testing', 'Maintenance', 'Holiday', 'Personal'
    ],
    default: 'Meeting'
  },
  color: {
    type: String
  },
  icon: {
    type: String
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrenceRule: {
    frequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Yearly']
    },
    interval: {
      type: Number,
      default: 1
    },
    count: {
      type: Number
    },
    until: {
      type: Date
    },
    excludeDates: {
      type: [Date],
      default: []
    }
  },
  attachments: [
    {
      name: String,
      fileData: String, // base64 string
      mimeType: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  comments: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      text: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  linkedActivities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    }
  ],
  reminderSettings: {
    timeBeforeMinutes: {
      type: Number,
      default: 15
    },
    type: {
      type: String,
      enum: ['popup', 'email', 'in-app'],
      default: 'in-app'
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('CalendarEvent', CalendarEventSchema);
