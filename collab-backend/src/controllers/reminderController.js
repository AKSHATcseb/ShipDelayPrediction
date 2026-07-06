import Reminder from '../models/Reminder.js';

export const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id })
      .populate('projectId', 'projectName')
      .populate('activityId', 'name')
      .populate('eventId', 'title');
    return res.json(reminders);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch reminders', error: error.message });
  }
};

export const createReminder = async (req, res) => {
  try {
    const { 
      title, description, projectId, activityId, 
      eventId, milestoneId, date, reminderType, timeBeforeMinutes 
    } = req.body;

    const reminder = await Reminder.create({
      userId: req.user._id,
      title,
      description,
      projectId: projectId || null,
      activityId: activityId || null,
      eventId: eventId || null,
      milestoneId: milestoneId || null,
      date: new Date(date),
      reminderType: reminderType || 'OneTime',
      timeBeforeMinutes: timeBeforeMinutes || 15
    });

    return res.status(201).json(reminder);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create reminder', error: error.message });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not own this reminder.' });
    }

    await reminder.deleteOne();
    return res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete reminder', error: error.message });
  }
};
