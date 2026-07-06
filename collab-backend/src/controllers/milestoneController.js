import Milestone from '../models/Milestone.js';
import ProjectMember from '../models/ProjectMember.js';

export const getMilestones = async (req, res) => {
  try {
    const { projectId } = req.params;
    const milestones = await Milestone.find({ projectId })
      .populate('owner', 'name email')
      .populate('relatedActivities', 'name currentStatus');
    return res.json(milestones);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch milestones', error: error.message });
  }
};

export const createMilestone = async (req, res) => {
  try {
    const { 
      projectId, name, description, relatedActivities, 
      priority, dueDate, status, completionPercentage, color, icon 
    } = req.body;

    // Check permissions: PM or Admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ message: 'Forbidden: Project Manager permissions required.' });
    }

    const milestone = await Milestone.create({
      projectId,
      name,
      description,
      relatedActivities: relatedActivities || [],
      priority: priority || 'Medium',
      dueDate: new Date(dueDate),
      status: status || 'Pending',
      owner: req.user._id,
      completionPercentage: completionPercentage || 0,
      color: color || '#D97706',
      icon: icon || 'Flag'
    });

    global.io?.emit('calendar-refresh');

    return res.status(201).json(milestone);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create milestone', error: error.message });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const updateData = req.body;

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    // Check permissions
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ message: 'Forbidden: Project Manager permissions required.' });
    }

    // Apply updates
    if (updateData.name !== undefined) milestone.name = updateData.name;
    if (updateData.description !== undefined) milestone.description = updateData.description;
    if (updateData.relatedActivities !== undefined) milestone.relatedActivities = updateData.relatedActivities;
    if (updateData.priority !== undefined) milestone.priority = updateData.priority;
    if (updateData.dueDate !== undefined) milestone.dueDate = new Date(updateData.dueDate);
    if (updateData.status !== undefined) milestone.status = updateData.status;
    if (updateData.completionPercentage !== undefined) milestone.completionPercentage = updateData.completionPercentage;
    if (updateData.color !== undefined) milestone.color = updateData.color;
    if (updateData.icon !== undefined) milestone.icon = updateData.icon;

    await milestone.save();
    global.io?.emit('calendar-refresh');

    return res.json(milestone);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update milestone', error: error.message });
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    if (req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ message: 'Forbidden: Project Manager permissions required.' });
    }

    await milestone.deleteOne();
    global.io?.emit('calendar-refresh');

    return res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete milestone', error: error.message });
  }
};
