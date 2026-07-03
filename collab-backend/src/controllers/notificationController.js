import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user._id })
      .populate('projectId', 'projectName projectIdCode')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(notifs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json(notif);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
};
