import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Activity from '../models/Activity.js';
import Template from '../models/Template.js';
import { propagateDelays } from '../services/cpmService.js';
import { runMLPrediction } from '../services/predictionClient.js';
import crypto from 'crypto';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';

// Helper: Topological sorting for template activities (using sequenceNumber)
const getTemplateActivitiesTopo = (activities) => {
  const inDegree = {};
  const adjList = {};
  const actMap = {};

  activities.forEach((act) => {
    const seq = act.sequenceNumber;
    actMap[seq] = act;
    inDegree[seq] = 0;
    adjList[seq] = [];
  });

  activities.forEach((act) => {
    const targetSeq = act.sequenceNumber;
    const deps = act.dependencyList || [];
    deps.forEach((sourceSeq) => {
      if (adjList[sourceSeq]) {
        adjList[sourceSeq].push(targetSeq);
        inDegree[targetSeq]++;
      }
    });
  });

  const queue = [];
  activities.forEach((act) => {
    const seq = act.sequenceNumber;
    if (inDegree[seq] === 0) {
      queue.push(seq);
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

  if (result.length !== activities.length) {
    return activities.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  return result;
};

export const createProject = async (req, res) => {
  try {
    const {
      projectName,
      projectIdCode,
      shipName,
      shipClass,
      shipType,
      projectCost,
      customer,
      startDate,
      templateId,
      priority
    } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: 'Project template selection is required' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Project template not found' });
    }

    const projectExists = await Project.findOne({ projectIdCode });
    if (projectExists) {
      return res.status(400).json({ message: 'Project code already exists' });
    }

    // Sort template activities topologically
    const topoActs = getTemplateActivitiesTopo(template.activities);

    // Schedule planned dates starting at project startDate
    const start = new Date(startDate);
    const endDates = {}; // Maps sequenceNumber to plannedEndDate (Date object)
    
    const scheduledActivities = topoActs.map((act) => {
      const deps = act.dependencyList || [];
      let actStart = new Date(start);
      
      if (deps.length > 0) {
        const depEnds = deps.map(seq => endDates[seq]).filter(d => d !== undefined);
        if (depEnds.length > 0) {
          actStart = new Date(Math.max(...depEnds.map(d => d.getTime())));
        }
      }
      
      const duration = act.durationMonths || 1.0;
      const actEnd = new Date(actStart);
      actEnd.setDate(actEnd.getDate() + Math.round(duration * 30));
      
      endDates[act.sequenceNumber] = actEnd;
      
      return {
        templateActivity: act,
        plannedStartDate: actStart,
        plannedEndDate: actEnd
      };
    });

    // Compute expected project end date (max of activity end dates)
    const expectedEndDate = scheduledActivities.length > 0 
      ? new Date(Math.max(...Object.values(endDates).map(d => d.getTime())))
      : start;

    const project = await Project.create({
      projectName,
      projectIdCode,
      shipName,
      shipClass,
      shipType: shipType || 'Submarine',
      projectCost: projectCost || 5000.0,
      customer,
      startDate: start,
      expectedEndDate,
      priority: priority || 'Medium',
      currentStatus: 'Active',
      feedbackLoops: template.feedbackLoops || []
    });

    // Instantiate activities in database
    const seqToMongoId = {};
    const createdActs = [];

    for (const sAct of scheduledActivities) {
      const act = await Activity.create({
        projectId: project._id,
        name: sAct.templateActivity.name,
        category: sAct.templateActivity.category || 'Other',
        sequenceNumber: sAct.templateActivity.sequenceNumber,
        parallelGroup: sAct.templateActivity.parallelGroup,
        plannedStartDate: sAct.plannedStartDate,
        plannedEndDate: sAct.plannedEndDate,
        durationMonths: sAct.templateActivity.durationMonths || 1.0,
        remainingMonths: sAct.templateActivity.durationMonths || 1.0,
        historicalRiskWeight: sAct.templateActivity.historicalRiskWeight || 50.0,
        isMilestone: sAct.templateActivity.isMilestone || false,
        isCriticalPath: sAct.templateActivity.isCriticalPath || false,
        assignedDepartment: sAct.templateActivity.responsibleDepartment || '',
        currentStatus: 'NotStarted',
        completionPercentage: 0.0,
        dependencyList: []
      });
      seqToMongoId[sAct.templateActivity.sequenceNumber] = act._id;
      createdActs.push({ act, templateDeps: sAct.templateActivity.dependencyList || [] });
    }

    // Resolve activity dependencies mapping (convert sequence numbers to MongoDB ObjectIds)
    for (const item of createdActs) {
      const mongoDeps = item.templateDeps.map(seq => seqToMongoId[seq]).filter(id => id !== undefined);
      if (mongoDeps.length > 0) {
        item.act.dependencyList = mongoDeps;
        await item.act.save();
      }
    }

    // Create ProjectMember linking current user as the Project Manager
    await ProjectMember.create({
      projectId: project._id,
      userId: req.user._id,
      role: 'PROJECT_MANAGER',
      status: 'Active'
    });

    // Propagate delays and calculate initial Critical Path Method scheduling
    await propagateDelays(project._id);

    // Trigger initial ML prediction
    await runMLPrediction(project._id);

    // Retrieve full project with updated predictions
    const finalProject = await Project.findById(project._id);

    return res.status(201).json(finalProject);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create project from template', error: error.message });
  }
};

export const getProjectDetails = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch project details', error: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const allowedUpdates = [
      'projectName', 'shipName', 'shipClass', 'shipType', 
      'projectCost', 'customer', 'startDate', 'expectedEndDate', 
      'priority', 'currentStatus'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    await project.save();
    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findByIdAndDelete(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Cascade delete members and activities
    await ProjectMember.deleteMany({ projectId });
    await Activity.deleteMany({ projectId });

    return res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
};

// Helper: Serialize project and activities state to JSON for report/predictions microservices
const getProjectStateJson = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  const activities = await Activity.find({ projectId }).sort({ sequenceNumber: 1 });

  const formattedActivities = activities.map((act) => ({
    name: act.name,
    category: act.category,
    sequence_number: act.sequenceNumber,
    planned_start_date: act.plannedStartDate ? act.plannedStartDate.toISOString().split('T')[0] : null,
    planned_end_date: act.plannedEndDate ? act.plannedEndDate.toISOString().split('T')[0] : null,
    current_status: act.currentStatus,
    completion_percentage: act.completionPercentage || 0,
    current_delay_days: act.currentDelayDays || 0,
    actual_start_date: act.actualStartDate ? act.actualStartDate.toISOString().split('T')[0] : null,
    actual_end_date: act.actualEndDate ? act.actualEndDate.toISOString().split('T')[0] : null,
    remarks: act.remarks || ""
  }));

  return {
    project_name: project.projectName,
    project_id_code: project.projectIdCode,
    ship_name: project.shipName || '',
    ship_class: project.shipClass || '',
    ship_type: project.shipType || 'Submarine',
    project_cost: project.projectCost || 5000.0,
    customer: project.customer || 'Indian Navy',
    start_date: project.startDate.toISOString().split('T')[0],
    expected_end_date: project.expectedEndDate.toISOString().split('T')[0],
    predicted_risk_category: project.predictedRiskCategory || 'Low',
    predicted_delay_pct: project.predictedDelayPct || 0.0,
    predicted_delay_months: project.predictedDelayMonths || 0.0,
    prediction_confidence: project.predictionConfidence || 85.0,
    feedback_loops: project.feedbackLoops || [],
    activities: formattedActivities
  };
};

export const getProjectPdfReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const state = await getProjectStateJson(projectId);

    const pythonServiceUrl = process.env.PYTHON_ML_SERVICE_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${pythonServiceUrl}/api/reports/generate/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ message: `Python reports service error: ${errorText}` });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Project_Report_${state.project_id_code}.pdf`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate PDF report', error: error.message });
  }
};

export const getProjectExcelReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const state = await getProjectStateJson(projectId);

    const pythonServiceUrl = process.env.PYTHON_ML_SERVICE_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${pythonServiceUrl}/api/reports/generate/excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ message: `Python reports service error: ${errorText}` });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Project_Report_${state.project_id_code}.xlsx`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate Excel report', error: error.message });
  }
};

export const getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const members = await ProjectMember.find({ projectId })
      .populate('userId', 'name email globalRole status')
      .sort({ joinedDate: -1 });
    return res.json(members);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch project members', error: error.message });
  }
};

export const inviteProjectCollaborator = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;

    // Check if user is already a member
    const invitedUser = await User.findOne({ email });
    if (invitedUser) {
      const existingMember = await ProjectMember.findOne({ projectId, userId: invitedUser._id });
      if (existingMember && existingMember.status === 'Active') {
        return res.status(400).json({ message: 'User is already a member of this project' });
      }
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create Invitation
    const invitation = await Invitation.create({
      projectId,
      email,
      role,
      invitedBy: req.user._id,
      token,
      expiresAt
    });

    // If user exists, create a Pending ProjectMember
    if (invitedUser) {
      await ProjectMember.findOneAndUpdate(
        { projectId, userId: invitedUser._id },
        { role, status: 'Pending' },
        { upsert: true, new: true }
      );
    }

    return res.status(201).json({
      message: 'Invitation generated successfully',
      invitationToken: token,
      invitation
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to invite collaborator', error: error.message });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    const { projectId, targetUserId } = req.params;

    const member = await ProjectMember.findOne({ projectId, userId: targetUserId });
    if (!member) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }
    if (member.role === 'Project Owner') {
      return res.status(400).json({ message: 'Cannot remove the Project Owner' });
    }

    member.status = 'Removed';
    await member.save();

    return res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to remove collaborator', error: error.message });
  }
};

export const acceptProjectInvitation = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    const invite = await Invitation.findOne({ token, status: 'Pending' });
    if (!invite || invite.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invitation invalid or expired' });
    }

    // Match recipient user email to current logged in user
    if (invite.email !== req.user.email) {
      return res.status(403).json({ message: 'This invitation belongs to another email address' });
    }

    invite.status = 'Accepted';
    await invite.save();

    // Set ProjectMember to Active
    await ProjectMember.findOneAndUpdate(
      { projectId: invite.projectId, userId: req.user._id },
      { role: invite.role, status: 'Active' },
      { upsert: true, new: true }
    );

    return res.json({ message: 'Invitation accepted successfully', projectId: invite.projectId });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to accept invitation', error: error.message });
  }
};
