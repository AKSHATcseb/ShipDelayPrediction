import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['National', 'Company'],
    default: 'National'
  }
}, {
  timestamps: true
});

export default mongoose.model('Holiday', HolidaySchema);
