import Activity from '../models/Activity.js';
import Project from '../models/Project.js';

// Topological sorting helper using Kahn's algorithm
export const getProjectActivitiesTopo = (activities) => {
  const inDegree = {};
  const adjList = {};
  const actMap = {};

  activities.forEach((act) => {
    const id = act._id.toString();
    actMap[id] = act;
    inDegree[id] = 0;
    adjList[id] = [];
  });

  activities.forEach((act) => {
    const targetId = act._id.toString();
    const deps = act.dependencyList || [];
    deps.forEach((depId) => {
      const sourceId = depId.toString();
      if (adjList[sourceId]) {
        adjList[sourceId].push(targetId);
        inDegree[targetId]++;
      }
    });
  });

  const queue = [];
  activities.forEach((act) => {
    const id = act._id.toString();
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  });

  const result = [];
  while (queue.length > 0) {
    const u = queue.shift();
    result.push(actMap[u]);

    const neighbors = adjList[u] || [];
    neighbors.forEach((v) => {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    });
  }

  // Fallback if there is a cycle (just return sorted by sequence number)
  if (result.length !== activities.length) {
    return activities.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  return result;
};

// Date math helper (add days)
const addDays = (dateStr, days) => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + days);
  return result;
};

// CPM date propagation
export const propagateDelays = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  const activities = await Activity.find({ projectId });
  const topoActivities = getProjectActivitiesTopo(activities);

  const endDates = {}; // Maps activity ID to expected completion Date
  const today = new Date();

  for (let act of topoActivities) {
    const actId = act._id.toString();
    const deps = act.dependencyList || [];
    const predecessorEnds = [];

    deps.forEach((depId) => {
      const depStr = depId.toString();
      if (endDates[depStr]) {
        predecessorEnds.push(endDates[depStr]);
      }
    });

    // Baseline start date is project start date, or max of predecessor end dates
    let expectedStart = new Date(project.startDate);
    if (predecessorEnds.length > 0) {
      expectedStart = new Date(Math.max(...predecessorEnds.map((d) => d.getTime())));
    }

    if (act.currentStatus === 'Completed') {
      const actualStart = act.actualStartDate || act.plannedStartDate || expectedStart;
      const actualEnd = act.actualEndDate || expectedStart;
      endDates[actId] = actualEnd;

      const actualDurDays = Math.round((new Date(actualEnd) - new Date(actualStart)) / (1000 * 60 * 60 * 24));
      const targetDurDays = Math.round((act.durationMonths || 1.0) * 30);
      act.currentDelayDays = Math.max(0, actualDurDays - targetDurDays);
    } else if (['InProgress', 'Delayed', 'Blocked'].includes(act.currentStatus)) {
      const actualStart = act.actualStartDate || expectedStart;
      const remMonths = act.remainingMonths !== undefined ? act.remainingMonths : 1.0;
      const expectedEnd = addDays(today, Math.round(remMonths * 30));

      const elapsedDays = Math.round((today - new Date(actualStart)) / (1000 * 60 * 60 * 24));
      const expectedDurDays = elapsedDays + Math.round(remMonths * 30);
      const targetDurDays = Math.round((act.durationMonths || 1.0) * 30);
      act.currentDelayDays = Math.max(0, expectedDurDays - targetDurDays);

      act.plannedEndDate = expectedEnd;
      endDates[actId] = expectedEnd;
    } else {
      // NotStarted
      const durMonths = act.durationMonths !== undefined ? act.durationMonths : 1.0;
      const durDays = Math.round(durMonths * 30);

      const oldPlannedStart = act.plannedStartDate;
      act.plannedStartDate = expectedStart;
      act.plannedEndDate = addDays(expectedStart, durDays);
      act.remainingMonths = durMonths;

      if (oldPlannedStart) {
        const shiftDays = Math.round((new Date(act.plannedStartDate) - new Date(oldPlannedStart)) / (1000 * 60 * 60 * 24));
        act.currentDelayDays = Math.max(0, shiftDays);
      } else {
        act.currentDelayDays = 0;
      }
      endDates[actId] = act.plannedEndDate;
    }

    // Save activity changes using Mongoose (respecting version locking)
    await act.save();
  }

  // Update project end date
  const endDatesValues = Object.values(endDates);
  if (endDatesValues.length > 0) {
    project.expectedEndDate = new Date(Math.max(...endDatesValues.map((d) => d.getTime())));
    await project.save();
  }
};
