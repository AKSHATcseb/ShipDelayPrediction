import mongoose from 'mongoose';

const ReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalendarEvent'
  },
  milestoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone'
  },
  date: {
    type: Date,
    required: true
  },
  reminderType: {
    type: String,
    enum: ['OneTime', 'Daily', 'Weekly', 'Monthly'],
    default: 'OneTime'
  },
  timeBeforeMinutes: {
    type: Number,
    default: 15
  },
  isSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Reminder', ReminderSchema);
