import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const getComments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { activityId } = req.query;

    const query = { projectId };
    if (activityId) {
      query.activityId = activityId;
    } else {
      query.activityId = null; // Matches null or non-existent activityId
    }

    const comments = await Comment.find(query)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 });

    return res.json(comments);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch comments', error: error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const { projectId, activityId, content, parentId } = req.body;

    // Regex to parse mentions like @Akshat or @admin@navalpmis.gov
    const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
    const matches = content.match(mentionRegex) || [];
    const mentionNamesOrEmails = matches.map(match => match.substring(1));

    const mentionedUsers = [];
    if (mentionNamesOrEmails.length > 0) {
      // Find users whose name or email matches the mention strings
      const users = await User.find({
        $or: [
          { name: { $in: mentionNamesOrEmails.map(name => new RegExp(`^${name}$`, 'i')) } },
          { email: { $in: mentionNamesOrEmails.map(email => email.toLowerCase()) } }
        ]
      });
      mentionedUsers.push(...users);
    }

    const comment = await Comment.create({
      projectId,
      activityId: activityId || null,
      userId: req.user._id,
      content,
      parentId: parentId || null,
      mentions: mentionedUsers.map(u => u._id)
    });

    // Populate user info for broadcast
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email');

    // Create notifications for mentioned users
    for (let u of mentionedUsers) {
      if (u._id.toString() !== req.user._id.toString()) {
        const notif = await Notification.create({
          userId: u._id,
          type: 'mention',
          content: `${req.user.name} mentioned you in a comment: "${content.substring(0, 50)}..."`,
          projectId,
          activityId: activityId || null
        });

        // Emit real-time notification via Socket.IO
        global.io?.to(`user_${u._id.toString()}`).emit('notification-received', notif);
      }
    }

    // Broadcast comment addition to project room
    global.io?.to(projectId.toString()).emit('comment-added', populatedComment);

    return res.status(201).json(populatedComment);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Only owner of comment or project manager can delete
    if (comment.userId.toString() !== req.user._id.toString() && req.projectRole !== 'PROJECT_MANAGER') {
      return res.status(403).json({ message: 'Access denied: Cannot delete other user\'s comment' });
    }

    comment.isDeleted = true;
    comment.content = 'This comment was deleted.';
    await comment.save();

    // Broadcast delete event
    global.io?.to(comment.projectId.toString()).emit('comment-deleted', { commentId });

    return res.json({ message: 'Comment deleted successfully', comment });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
};
