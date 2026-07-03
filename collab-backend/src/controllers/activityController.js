import Activity from '../models/Activity.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ProjectMember from '../models/ProjectMember.js';
import Project from '../models/Project.js';
import { propagateDelays } from '../services/cpmService.js';
import { runMLPrediction } from '../services/predictionClient.js';
import { getActivityLock } from '../socket/socketHandler.js';

export const getActivities = async (req, res) => {
  try {
    const { projectId } = req.params;
    const activities = await Activity.find({ projectId }).sort({ sequenceNumber: 1 });
    return res.json(activities);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch activities', error: error.message });
  }
};

export const createActivity = async (req, res) => {
  try {
    const { projectId, name, category, sequenceNumber, durationMonths, dependencyList } = req.body;
    
    // Convert string array of dependency IDs to mongoose ObjectIds
    const dependencies = (dependencyList || []).map(id => id.toString());

    const activity = await Activity.create({
      projectId,
      name,
      category,
      sequenceNumber,
      durationMonths: durationMonths || 1.0,
      remainingMonths: durationMonths || 1.0,
      dependencyList: dependencies
    });

    // Run propagation
    await propagateDelays(projectId);
    
    return res.status(201).json(activity);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create activity', error: error.message });
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const {
      currentStatus,
      completionPercentage,
      actualStartDate,
      actualEndDate,
      durationMonths,
      remainingMonths,
      remarks,
      assignedOfficer,
      assignedDepartment,
      version // Client sent version key for optimistic locking!
    } = req.body;

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const wasJustCompleted = (activity.currentStatus !== 'Completed' && currentStatus === 'Completed');
    const wasJustAssigned = (assignedOfficer !== undefined && activity.assignedOfficer !== assignedOfficer && assignedOfficer !== '');

    // 1. Soft-locking Check
    const lock = getActivityLock(activityId);
    if (lock && lock.userId !== req.user._id.toString()) {
      return res.status(423).json({
        message: `Locked: This activity is currently being edited by ${lock.userName || 'another user'}.`
      });
    }

    // 2. Optimistic Concurrency Control Check (Optimistic Locking)
    if (version !== undefined && activity.__v !== version) {
      return res.status(409).json({
        message: 'Conflict: This task has been updated by another user in the meantime. Please reload current state.'
      });
    }

    // Resolve updates with business rules
    let nextStatus = currentStatus || activity.currentStatus;
    let nextDuration = durationMonths !== undefined ? durationMonths : activity.durationMonths;
    let nextRemaining = remainingMonths !== undefined ? remainingMonths : activity.remainingMonths;
    let nextCompletion = completionPercentage !== undefined ? completionPercentage : activity.completionPercentage;
    let nextActualStart = actualStartDate !== undefined ? (actualStartDate ? new Date(actualStartDate) : null) : activity.actualStartDate;
    let nextActualEnd = actualEndDate !== undefined ? (actualEndDate ? new Date(actualEndDate) : null) : activity.actualEndDate;

    // Predecessor dependency completion check
    if (['InProgress', 'Completed', 'Delayed', 'Blocked'].includes(nextStatus)) {
      const deps = activity.dependencyList || [];
      for (const depId of deps) {
        const depAct = await Activity.findById(depId);
        if (depAct && depAct.currentStatus !== 'Completed') {
          return res.status(400).json({
            message: `Cannot start activity '${activity.name}'. Predecessor task '${depAct.name}' is not completed.`
          });
        }
      }
    }

    // Rule: Completed task consistency
    if (nextStatus === 'Completed') {
      nextRemaining = 0.0;
      nextCompletion = 100.0;
      if (!nextActualStart) {
        nextActualStart = activity.plannedStartDate || new Date();
      }
      if (!nextActualEnd) {
        nextActualEnd = new Date();
      }
    }

    // Rule 4: If remaining months exceeds duration months, status falls under Delayed
    if (nextRemaining > nextDuration && nextStatus !== 'Completed') {
      nextStatus = 'Delayed';
    }

    // Rule: Auto-assign actual start when starting
    if (['InProgress', 'Delayed'].includes(nextStatus) && !nextActualStart) {
      nextActualStart = new Date();
      if (nextCompletion === 0) {
        nextCompletion = 5.0;
      }
    }

    // Capture old values for audit logs
    const updatesApplied = {
      currentStatus: nextStatus,
      completionPercentage: nextCompletion,
      actualStartDate: nextActualStart,
      actualEndDate: nextActualEnd,
      durationMonths: nextDuration,
      remainingMonths: nextRemaining,
      remarks: remarks || activity.remarks,
      assignedOfficer: assignedOfficer !== undefined ? assignedOfficer : activity.assignedOfficer,
      assignedDepartment: assignedDepartment !== undefined ? assignedDepartment : activity.assignedDepartment
    };

    // Track Audit Log details
    const auditEntries = [];
    const changeReason = remarks || 'Manual update';

    Object.keys(updatesApplied).forEach((field) => {
      let oldVal = activity[field];
      let newVal = updatesApplied[field];

      // Convert Date objects to ISO string comparison
      if (oldVal instanceof Date) oldVal = oldVal.toISOString().split('T')[0];
      if (newVal instanceof Date) newVal = newVal.toISOString().split('T')[0];

      if (oldVal !== newVal && newVal !== undefined) {
        auditEntries.push({
          projectId: activity.projectId,
          activityId: activity._id,
          userId: req.user._id,
          fieldChanged: field,
          oldValue: oldVal !== null && oldVal !== undefined ? oldVal.toString() : '',
          newValue: newVal !== null && newVal !== undefined ? newVal.toString() : '',
          changeReason
        });
        activity[field] = updatesApplied[field];
      }
    });

    // Write audit entries to database
    if (auditEntries.length > 0) {
      await AuditLog.insertMany(auditEntries);
    }

    // Save changes (Mongoose will increment __v automatically and validate version)
    await activity.save();

    // Get the project before running ML predictions to compare risk/delay changes
    const projectBefore = await Project.findById(activity.projectId);

    // 3. CPM Timeline Date Propagation
    await propagateDelays(activity.projectId);

    // 4. Trigger ML Prediction Pipeline via Python server
    const predictionResult = await runMLPrediction(activity.projectId);
    const projectAfter = predictionResult.project;

    // Get the updated activity representing the changes
    const updatedActivity = await Activity.findById(activityId);

    // Trigger notifications
    try {
      // 1. Task Assignment Notification
      if (wasJustAssigned) {
        const escapedName = assignedOfficer.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const assignedUser = await User.findOne({ name: new RegExp(`^${escapedName}$`, 'i') });
        if (assignedUser) {
          const notif = await Notification.create({
            userId: assignedUser._id,
            type: 'assigned',
            content: `You have been assigned to task '${activity.name}' in project '${projectAfter?.projectName || ''}'.`,
            projectId: activity.projectId,
            activityId: activity._id
          });
          global.io?.to(`user_${assignedUser._id.toString()}`).emit('notification-received', notif);
        }
      }

      // 2. Downstream Task Unlocked Notifications
      if (wasJustCompleted) {
        const downstreamActivities = await Activity.find({
          projectId: activity.projectId,
          dependencyList: activity._id
        });

        for (const downAct of downstreamActivities) {
          // Check if all its dependencies are Completed
          const uncompletedDeps = await Activity.find({
            _id: { $in: downAct.dependencyList },
            currentStatus: { $ne: 'Completed' }
          });

          if (uncompletedDeps.length === 0) {
            let notifiedUserIds = new Set();
            if (downAct.assignedOfficer) {
              const escapedDownName = downAct.assignedOfficer.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
              const assignedUser = await User.findOne({ name: new RegExp(`^${escapedDownName}$`, 'i') });
              if (assignedUser) {
                const notif = await Notification.create({
                  userId: assignedUser._id,
                  type: 'activity_complete',
                  content: `Task unlocked: '${downAct.name}' is now ready to start in project '${projectAfter?.projectName || ''}' as all predecessor tasks are completed.`,
                  projectId: activity.projectId,
                  activityId: downAct._id
                });
                global.io?.to(`user_${assignedUser._id.toString()}`).emit('notification-received', notif);
                notifiedUserIds.add(assignedUser._id.toString());
              }
            }

            const managers = await ProjectMember.find({ projectId: activity.projectId, role: 'PROJECT_MANAGER', status: 'Active' });
            for (const mgr of managers) {
              if (!notifiedUserIds.has(mgr.userId.toString())) {
                const notif = await Notification.create({
                  userId: mgr.userId,
                  type: 'activity_complete',
                  content: `Task unlocked: '${downAct.name}' is now ready to start in project '${projectAfter?.projectName || ''}'.`,
                  projectId: activity.projectId,
                  activityId: downAct._id
                });
                global.io?.to(`user_${mgr.userId.toString()}`).emit('notification-received', notif);
              }
            }
          }
        }
      }

      // 3. ML Risk / Delay Change Warning Notification
      if (projectBefore && projectAfter) {
        const riskWeights = { Low: 1, Medium: 2, High: 3, Critical: 4 };
        const riskIncreased = riskWeights[projectAfter.predictedRiskCategory] > riskWeights[projectBefore.predictedRiskCategory];
        const delayIncreased = (projectAfter.predictedDelayMonths - projectBefore.predictedDelayMonths) >= 1.0;

        if (riskIncreased || delayIncreased) {
          const members = await ProjectMember.find({ projectId: activity.projectId, status: 'Active' });
          const content = riskIncreased 
            ? `Risk Warning: Predicted risk level for '${projectAfter.projectName}' escalated to ${projectAfter.predictedRiskCategory}.`
            : `Delay Warning: Predicted delay for '${projectAfter.projectName}' increased to +${projectAfter.predictedDelayMonths.toFixed(1)} months.`;

          for (const member of members) {
            const notif = await Notification.create({
              userId: member.userId,
              type: 'risk_change',
              content,
              projectId: activity.projectId
            });
            global.io?.to(`user_${member.userId.toString()}`).emit('notification-received', notif);
          }
        }
      }
    } catch (err) {
      console.error('Failed to trigger notifications:', err);
    }

    // Get active clients to broadcast Socket.IO events (handled via global Io instance in socketHandler)
    global.io?.to(activity.projectId.toString()).emit('activity-updated', {
      activity: updatedActivity,
      project: predictionResult.project,
      auditLogs: auditEntries,
      topDrivers: predictionResult.topDrivers,
      recommendations: predictionResult.recommendations
    });

    return res.json({
      activity: updatedActivity,
      project: predictionResult.project,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    if (error.name === 'VersionError') {
      return res.status(409).json({
        message: 'Conflict: This task was modified concurrently by another user. Please reload and retry.'
      });
    }
    return res.status(500).json({ message: 'Failed to update activity', error: error.message });
  }
};

export const getActivityTimeline = async (req, res) => {
  try {
    const { activityId } = req.params;
    const logs = await AuditLog.find({ activityId })
      .populate('userId', 'name email')
      .sort({ timestamp: -1 });
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch timeline logs', error: error.message });
  }
};

export const getProjectTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;
    const logs = await AuditLog.find({ projectId })
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(50);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch project timeline logs', error: error.message });
  }
};
