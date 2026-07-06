import CalendarEvent from '../models/CalendarEvent.js';
import Activity from '../models/Activity.js';
import Project from '../models/Project.js';
import Holiday from '../models/Holiday.js';
import Milestone from '../models/Milestone.js';
import { propagateDelays } from '../services/cpmService.js';
import { runMLPrediction } from '../services/predictionClient.js';

// Category color and icon mappings
const CATEGORY_STYLES = {
  Project: { color: '#12355B', icon: 'Anchor' },
  Milestone: { color: '#D97706', icon: 'Flag' },
  Meeting: { color: '#2F6690', icon: 'Users' },
  Reminder: { color: '#6366F1', icon: 'Bell' },
  Deadline: { color: '#C62828', icon: 'AlertTriangle' },
  Activity: { color: '#475569', icon: 'ClipboardList' },
  'Critical Activity': { color: '#B91C1C', icon: 'Activity' },
  'Risk Review': { color: '#EA580C', icon: 'ShieldAlert' },
  Inspection: { color: '#059669', icon: 'Search' },
  Approval: { color: '#9333EA', icon: 'CheckSquare' },
  Testing: { color: '#2563EB', icon: 'Sliders' },
  Maintenance: { color: '#D97706', icon: 'Wrench' },
  Holiday: { color: '#0D9488', icon: 'CalendarDays' },
  Personal: { color: '#DB2777', icon: 'User' }
};

export const getEvents = async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let manualEventsQuery = {};
    let projectsQuery = {};
    let activitiesQuery = {};
    let milestonesQuery = {};

    if (projectId) {
      manualEventsQuery.projectId = projectId;
      projectsQuery._id = projectId;
      activitiesQuery.projectId = projectId;
      milestonesQuery.projectId = projectId;
    }

    if (start && end) {
      manualEventsQuery.start = { $gte: start, $lte: end };
    }

    // 1. Fetch manual events
    const manualEvents = await CalendarEvent.find(manualEventsQuery)
      .populate('ownerId', 'name email')
      .populate('linkedActivities', 'name currentStatus');

    // 2. Fetch projects to compile start/end dates
    const projects = await Project.find(projectsQuery);
    
    // 3. Fetch activities to compile planned/actual start/end dates
    const activities = await Activity.find(activitiesQuery);

    // 4. Fetch milestones
    const milestones = await Milestone.find(milestonesQuery).populate('owner', 'name email');

    // 5. Fetch holidays
    let holidaysQuery = {};
    if (start && end) {
      holidaysQuery.date = { $gte: start, $lte: end };
    }
    const holidays = await Holiday.find(holidaysQuery);

    const compiledEvents = [];

    // Compile Project Start and expected completion events
    projects.forEach((proj) => {
      if (proj.startDate) {
        compiledEvents.push({
          _id: `proj_start_${proj._id}`,
          title: `[Start] ${proj.projectName}`,
          description: `Kickoff date of ship acquisition program: ${proj.shipName || ''}`,
          start: proj.startDate,
          end: proj.startDate,
          category: 'Project',
          color: CATEGORY_STYLES.Project.color,
          icon: CATEGORY_STYLES.Project.icon,
          projectId: proj._id,
          priority: proj.priority,
          status: 'Completed',
          isSystem: true
        });
      }
      if (proj.expectedEndDate) {
        compiledEvents.push({
          _id: `proj_end_${proj._id}`,
          title: `[End] ${proj.projectName}`,
          description: `Estimated completion handover date of vessel. Risk category: ${proj.predictedRiskCategory}`,
          start: proj.expectedEndDate,
          end: proj.expectedEndDate,
          category: 'Project',
          color: proj.predictedRiskCategory === 'Critical' || proj.predictedRiskCategory === 'High' ? '#C62828' : CATEGORY_STYLES.Project.color,
          icon: 'Ship',
          projectId: proj._id,
          priority: proj.priority,
          status: proj.currentStatus === 'Completed' ? 'Completed' : 'Pending',
          isSystem: true
        });
      }
    });

    // Compile Activity-based events
    activities.forEach((act) => {
      const labelPrefix = act.isCriticalPath ? '[Critical] ' : '';
      const cat = act.isCriticalPath ? 'Critical Activity' : 'Activity';
      const color = act.isCriticalPath ? CATEGORY_STYLES['Critical Activity'].color : CATEGORY_STYLES.Activity.color;
      const icon = act.isCriticalPath ? CATEGORY_STYLES['Critical Activity'].icon : CATEGORY_STYLES.Activity.icon;

      // Planned Timeline Event
      if (act.plannedStartDate && act.plannedEndDate) {
        compiledEvents.push({
          _id: `act_planned_${act._id}`,
          title: `${labelPrefix}${act.name} (Planned)`,
          description: `Category: ${act.category}. Assigned: ${act.assignedOfficer || 'Unassigned'} (${act.assignedDepartment || 'N/A'}).`,
          start: act.plannedStartDate,
          end: act.plannedEndDate,
          category: cat,
          color: color,
          icon: icon,
          projectId: act.projectId,
          activityId: act._id,
          priority: act.isCriticalPath ? 'High' : 'Medium',
          status: act.currentStatus === 'Completed' ? 'Completed' : 'Pending',
          isSystem: true
        });
      }

      // Actual execution event if started
      if (act.actualStartDate) {
        compiledEvents.push({
          _id: `act_actual_start_${act._id}`,
          title: `[Actual Start] ${act.name}`,
          description: `Task actually started on this date. Current status: ${act.currentStatus}. Completion: ${act.completionPercentage}%.`,
          start: act.actualStartDate,
          end: act.actualStartDate,
          category: 'Activity',
          color: '#2563EB',
          icon: 'Play',
          projectId: act.projectId,
          activityId: act._id,
          priority: 'Medium',
          status: 'Completed',
          isSystem: true
        });
      }

      // Actual completion date
      if (act.actualEndDate) {
        compiledEvents.push({
          _id: `act_actual_end_${act._id}`,
          title: `[Actual End] ${act.name}`,
          description: `Task completed successfully on this date. Delay days recorded: ${act.currentDelayDays || 0} days.`,
          start: act.actualEndDate,
          end: act.actualEndDate,
          category: 'Activity',
          color: '#10B981',
          icon: 'CheckCircle',
          projectId: act.projectId,
          activityId: act._id,
          priority: 'Medium',
          status: 'Completed',
          isSystem: true
        });
      }

      // Synchronize Milestones inside Activities
      if (act.isMilestone && act.plannedEndDate) {
        compiledEvents.push({
          _id: `act_milestone_${act._id}`,
          title: `[Milestone] ${act.name}`,
          description: `Critical project milestone. Category: ${act.category}. Completion: ${act.completionPercentage}%.`,
          start: act.plannedEndDate,
          end: act.plannedEndDate,
          category: 'Milestone',
          color: CATEGORY_STYLES.Milestone.color,
          icon: CATEGORY_STYLES.Milestone.icon,
          projectId: act.projectId,
          activityId: act._id,
          priority: 'Critical',
          status: act.currentStatus === 'Completed' ? 'Completed' : 'Pending',
          isSystem: true
        });
      }
    });

    // Compile Milestone-specific database documents
    milestones.forEach((ms) => {
      compiledEvents.push({
        _id: `ms_${ms._id}`,
        title: `[Milestone] ${ms.name}`,
        description: ms.description || 'Milestone date',
        start: ms.dueDate,
        end: ms.dueDate,
        category: 'Milestone',
        color: ms.color || CATEGORY_STYLES.Milestone.color,
        icon: ms.icon || CATEGORY_STYLES.Milestone.icon,
        projectId: ms.projectId,
        milestoneId: ms._id,
        priority: ms.priority,
        status: ms.status,
        ownerId: ms.owner,
        isSystem: false
      });
    });

    // Compile Holidays
    holidays.forEach((hol) => {
      compiledEvents.push({
        _id: `hol_${hol._id}`,
        title: `[Holiday] ${hol.name}`,
        description: `${hol.type} holiday.`,
        start: hol.date,
        end: hol.date,
        category: 'Holiday',
        color: CATEGORY_STYLES.Holiday.color,
        icon: CATEGORY_STYLES.Holiday.icon,
        isHoliday: true,
        isSystem: true
      });
    });

    // Combine manual events and compiled events
    const allEvents = [...manualEvents, ...compiledEvents];
    return res.json(allEvents);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch calendar events', error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { 
      projectId, title, description, start, end, 
      priority, category, isRecurring, recurrenceRule,
      linkedActivities, reminderSettings
    } = req.body;

    const style = CATEGORY_STYLES[category] || { color: '#2F6690', icon: 'Calendar' };

    const event = await CalendarEvent.create({
      projectId: projectId || null,
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      ownerId: req.user._id,
      priority: priority || 'Medium',
      category: category || 'Meeting',
      color: style.color,
      icon: style.icon,
      isRecurring: isRecurring || false,
      recurrenceRule: recurrenceRule || undefined,
      linkedActivities: linkedActivities || [],
      reminderSettings: reminderSettings || { timeBeforeMinutes: 15, type: 'in-app' }
    });

    // Broadcast Socket event for real-time sync
    global.io?.emit('calendar-refresh');

    return res.status(201).json(event);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create event', error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;

    // Detect if this is a system event drag-and-drop
    if (eventId.startsWith('act_planned_')) {
      // It's a system activity! We need to update the activity date directly and run CPM.
      const activityId = eventId.replace('act_planned_', '');
      const activity = await Activity.findById(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Linked Activity not found' });
      }

      // Perform timeline date shift
      const originalStart = new Date(activity.plannedStartDate);
      const originalEnd = new Date(activity.plannedEndDate);
      const newStart = new Date(updateData.start);
      
      // Calculate shift duration
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      const newEnd = updateData.end ? new Date(updateData.end) : new Date(newStart.getTime() + durationMs);

      activity.plannedStartDate = newStart;
      activity.plannedEndDate = newEnd;
      await activity.save();

      // Recalculate critical path and downstream dates
      await propagateDelays(activity.projectId);
      await runMLPrediction(activity.projectId);

      // Broadcast changes
      global.io?.to(activity.projectId.toString()).emit('activity-updated-broadcast', { projectId: activity.projectId });
      global.io?.emit('calendar-refresh');

      return res.json({ message: 'Activity schedule updated and CPM propagated successfully.' });
    }

    if (eventId.startsWith('proj_start_') || eventId.startsWith('proj_end_') || eventId.startsWith('act_actual_') || eventId.startsWith('act_milestone_') || eventId.startsWith('hol_')) {
      return res.status(400).json({ message: 'System-generated events cannot be modified directly.' });
    }

    // Normal manual event update
    const event = await CalendarEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions (must be Admin, PM, or Owner)
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER' && event.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to modify this event.' });
    }

    // Apply updates
    if (updateData.title !== undefined) event.title = updateData.title;
    if (updateData.description !== undefined) event.description = updateData.description;
    if (updateData.start !== undefined) event.start = new Date(updateData.start);
    if (updateData.end !== undefined) event.end = new Date(updateData.end);
    if (updateData.priority !== undefined) event.priority = updateData.priority;
    if (updateData.status !== undefined) event.status = updateData.status;
    if (updateData.category !== undefined) {
      event.category = updateData.category;
      const style = CATEGORY_STYLES[updateData.category] || { color: '#2F6690', icon: 'Calendar' };
      event.color = style.color;
      event.icon = style.icon;
    }
    if (updateData.isRecurring !== undefined) event.isRecurring = updateData.isRecurring;
    if (updateData.recurrenceRule !== undefined) event.recurrenceRule = updateData.recurrenceRule;
    if (updateData.linkedActivities !== undefined) event.linkedActivities = updateData.linkedActivities;
    if (updateData.reminderSettings !== undefined) event.reminderSettings = updateData.reminderSettings;

    await event.save();
    global.io?.emit('calendar-refresh');

    return res.json(event);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update event', error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (eventId.startsWith('proj_') || eventId.startsWith('act_') || eventId.startsWith('hol_')) {
      return res.status(400).json({ message: 'System events cannot be deleted.' });
    }

    const event = await CalendarEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER' && event.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to delete this event.' });
    }

    await event.deleteOne();
    global.io?.emit('calendar-refresh');

    return res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete event', error: error.message });
  }
};

// Commenting on Events
export const addEventComment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text } = req.body;

    const event = await CalendarEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const newComment = {
      userId: req.user._id,
      userName: req.user.name,
      text,
      timestamp: new Date()
    };

    event.comments.push(newComment);
    await event.save();

    return res.status(201).json(event);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// Attachments
export const uploadEventAttachment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, fileData, mimeType } = req.body;

    const event = await CalendarEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.attachments.push({ name, fileData, mimeType });
    await event.save();

    return res.status(201).json(event);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload attachment', error: error.message });
  }
};

// Holidays Management
export const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    return res.json(holidays);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch holidays', error: error.message });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const { name, date, type } = req.body;
    
    // Admin only or Project Manager
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }

    const holiday = await Holiday.create({ name, date: new Date(date), type });
    global.io?.emit('calendar-refresh');

    return res.status(201).json(holiday);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create holiday', error: error.message });
  }
};
