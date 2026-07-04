import Template from '../models/Template.js';
import Project from '../models/Project.js';
import Activity from '../models/Activity.js';
import Dependency from '../models/Dependency.js';
import { runMLPrediction } from '../services/predictionClient.js';
import mongoose from 'mongoose';

// Dynamic migration helper to synchronize legacy templates/projects to Dependency collection
const ensureDependenciesExist = async (entityId, type) => {
  const isTemplate = type === 'template';
  const query = isTemplate ? { templateId: entityId } : { projectId: entityId };
  
  const existingDeps = await Dependency.find(query);
  if (existingDeps.length > 0) {
    return existingDeps;
  }

  // Generate on the fly
  const depsToCreate = [];
  if (isTemplate) {
    const template = await Template.findById(entityId);
    if (!template) return [];

    // Create Normal dependencies from activity.dependencyList
    template.activities.forEach((act) => {
      (act.dependencyList || []).forEach((predSeq) => {
        depsToCreate.push({
          templateId: entityId,
          sourceActivity: predSeq.toString(),
          destinationActivity: act.sequenceNumber.toString(),
          dependencyType: 'Normal',
          loopFlag: false,
          timestamp: new Date()
        });
      });
    });

    // Create Loop dependencies from template.feedbackLoops
    (template.feedbackLoops || []).forEach((loop) => {
      depsToCreate.push({
        templateId: entityId,
        sourceActivity: loop.sourceActivity.toString(),
        destinationActivity: loop.destinationActivity.toString(),
        dependencyType: 'Loop',
        loopFlag: true,
        loopConfiguration: loop.loopConfiguration || {},
        timestamp: new Date()
      });
    });
  } else {
    const project = await Project.findById(entityId);
    if (!project) return [];

    const activities = await Activity.find({ projectId: entityId });
    const actMap = {};
    activities.forEach(a => actMap[a._id.toString()] = a);

    // Create Normal dependencies from activity.dependencyList
    activities.forEach((act) => {
      (act.dependencyList || []).forEach((predId) => {
        const pred = actMap[predId.toString()];
        if (pred) {
          depsToCreate.push({
            projectId: entityId,
            sourceActivity: pred._id.toString(),
            destinationActivity: act._id.toString(),
            dependencyType: 'Normal',
            loopFlag: false,
            timestamp: new Date()
          });
        }
      });
    });

    // Create Loop dependencies from project.feedbackLoops
    (project.feedbackLoops || []).forEach((loop) => {
      depsToCreate.push({
        projectId: entityId,
        sourceActivity: loop.sourceActivity.toString(),
        destinationActivity: loop.destinationActivity.toString(),
        dependencyType: 'Loop',
        loopFlag: true,
        loopConfiguration: loop.loopConfiguration || {},
        timestamp: new Date()
      });
    });
  }

  if (depsToCreate.length > 0) {
    return await Dependency.insertMany(depsToCreate);
  }
  return [];
};

// Shared Workflow Graph Layout and Decision Diamond Generator
const buildWorkflowGraph = (activities, loops) => {
  // 1. Format Nodes (activities only)
  const nodes = activities.map((act) => {
    const actId = act._id ? act._id.toString() : act.sequenceNumber.toString();
    return {
      id: actId,
      type: 'activityNode',
      data: {
        label: act.name,
        sequenceNumber: act.sequenceNumber,
        category: act.category,
        durationMonths: act.durationMonths,
        isMilestone: act.isMilestone,
        isCriticalPath: act.isCriticalPath,
        currentStatus: act.currentStatus || 'NotStarted',
        completionPercentage: act.completionPercentage || 0,
        plannedStartDate: act.plannedStartDate || act.planned_start_date,
        plannedEndDate: act.plannedEndDate || act.planned_end_date,
        actualStartDate: act.actualStartDate || act.actual_start_date,
        actualEndDate: act.actualEndDate || act.actual_end_date,
        currentDelayDays: act.currentDelayDays || act.current_delay_days || 0,
        historicalRiskWeight: act.historicalRiskWeight || act.historical_risk_weight || 0,
        responsibleDepartment: act.responsibleDepartment || act.responsible_department || 'Shipyard'
      },
      parallelGroup: act.parallelGroup || 0
    };
  });

  // 2. Format Edges
  const edges = [];
  const actMap = {};
  activities.forEach(a => {
    const aId = a._id ? a._id.toString() : a.sequenceNumber.toString();
    actMap[aId] = a;
  });

  const getPredecessorNodeId = (predVal) => {
    if (predVal && predVal.toString().length > 12) {
      return predVal.toString();
    } else {
      const predAct = activities.find(a => a.sequenceNumber === parseInt(predVal));
      return predAct ? (predAct._id ? predAct._id.toString() : predAct.sequenceNumber.toString()) : null;
    }
  };

  // Normal sequential dependencies
  activities.forEach(act => {
    const actId = act._id ? act._id.toString() : act.sequenceNumber.toString();
    const deps = act.dependencyList || act.dependency_list || [];

    deps.forEach(depVal => {
      const predNodeId = getPredecessorNodeId(depVal);
      if (predNodeId) {
        const isCriticalLink = actMap[predNodeId]?.isCriticalPath && act.isCriticalPath;
        edges.push({
          id: `e_${predNodeId}_${actId}`,
          source: predNodeId,
          target: actId,
          style: isCriticalLink 
            ? { stroke: '#ef4444', strokeWidth: 3 } 
            : { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { 
            type: 'arrowclosed', 
            color: isCriticalLink ? '#ef4444' : '#3b82f6' 
          }
        });
      }
    });
  });

  // Loop feedback edges (direct from source activity to destination activity)
  (loops || []).forEach(loop => {
    const srcSeq = loop.sourceActivity;
    const destSeq = loop.destinationActivity;
    
    const srcAct = activities.find(a => a.sequenceNumber === parseInt(srcSeq));
    const destAct = activities.find(a => a.sequenceNumber === parseInt(destSeq));
    
    if (srcAct && destAct) {
      const srcId = srcAct._id ? srcAct._id.toString() : srcAct.sequenceNumber.toString();
      const destId = destAct._id ? destAct._id.toString() : destAct.sequenceNumber.toString();
      
      edges.push({
        id: `e_loop_${srcId}_${destId}`,
        source: srcId,
        target: destId,
        type: 'smoothstep',
        label: '↺ Loop',
        animated: true,
        style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' },
        labelStyle: { fill: '#ef4444', fontWeight: 'bold', fontSize: 10 },
        markerEnd: { type: 'arrowclosed', color: '#ef4444' },
        data: {
          dependencyType: 'Loop',
          loopConfig: loop.loopConfiguration
        }
      });
    }
  });

  return { nodes, edges };
};

// GET Workflow Graph (Template)
export const getTemplateWorkflow = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await ensureDependenciesExist(templateId, 'template');
    const { nodes, edges } = buildWorkflowGraph(template.activities, template.feedbackLoops);

    return res.json({ nodes, edges, loops: template.feedbackLoops || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve template workflow', error: error.message });
  }
};

// GET Workflow Graph (Project)
export const getProjectWorkflow = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const activities = await Activity.find({ projectId }).sort({ sequenceNumber: 1 });
    await ensureDependenciesExist(projectId, 'project');
    const { nodes, edges } = buildWorkflowGraph(activities, project.feedbackLoops);

    return res.json({ nodes, edges, loops: project.feedbackLoops || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve project workflow', error: error.message });
  }
};

// CREATE Template Loop
export const createTemplateLoop = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { sourceActivity, destinationActivity, loopConfiguration } = req.body;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Prevent duplicate loop edges
    const duplicate = (template.feedbackLoops || []).some(
      l => l.sourceActivity === sourceActivity.toString() && l.destinationActivity === destinationActivity.toString()
    );
    if (duplicate) {
      return res.status(400).json({ message: 'Loop connection already exists between these activities.' });
    }

    const loopId = new mongoose.Types.ObjectId();
    const newLoop = {
      _id: loopId,
      sourceActivity: sourceActivity.toString(),
      destinationActivity: destinationActivity.toString(),
      dependencyType: 'Loop',
      loopFlag: true,
      loopConfiguration: {
        maxIterations: loopConfiguration?.maxIterations || 5,
        expectedAvgIterations: loopConfiguration?.expectedAvgIterations || 2,
        isMandatory: loopConfiguration?.isMandatory || false
      }
    };

    template.feedbackLoops.push(newLoop);
    await template.save();

    // Ensure dependencies exist first, then add loop dependency
    await ensureDependenciesExist(templateId, 'template');
    await Dependency.create({
      templateId,
      sourceActivity: sourceActivity.toString(),
      destinationActivity: destinationActivity.toString(),
      dependencyType: 'Loop',
      loopFlag: true,
      loopConfiguration: newLoop.loopConfiguration,
      createdBy: req.user?._id
    });

    return res.status(201).json(newLoop);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create template loop', error: error.message });
  }
};

// UPDATE Template Loop
export const updateTemplateLoop = async (req, res) => {
  try {
    const { templateId, loopId } = req.params;
    const { loopConfiguration } = req.body;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const loopIndex = template.feedbackLoops.findIndex(l => l._id && l._id.toString() === loopId);
    if (loopIndex === -1) {
      return res.status(404).json({ message: 'Loop not found' });
    }

    const targetLoop = template.feedbackLoops[loopIndex];
    targetLoop.loopConfiguration = {
      maxIterations: loopConfiguration?.maxIterations !== undefined ? loopConfiguration.maxIterations : targetLoop.loopConfiguration.maxIterations,
      expectedAvgIterations: loopConfiguration?.expectedAvgIterations !== undefined ? loopConfiguration.expectedAvgIterations : targetLoop.loopConfiguration.expectedAvgIterations,
      isMandatory: loopConfiguration?.isMandatory !== undefined ? loopConfiguration.isMandatory : targetLoop.loopConfiguration.isMandatory
    };

    template.feedbackLoops[loopIndex] = targetLoop;
    template.markModified('feedbackLoops');
    await template.save();

    // Sync Dependency entity
    await Dependency.findOneAndUpdate(
      {
        templateId,
        sourceActivity: targetLoop.sourceActivity,
        destinationActivity: targetLoop.destinationActivity,
        dependencyType: 'Loop'
      },
      { loopConfiguration: targetLoop.loopConfiguration }
    );

    return res.json(targetLoop);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update template loop', error: error.message });
  }
};

// DELETE Template Loop
export const deleteTemplateLoop = async (req, res) => {
  try {
    const { templateId, loopId } = req.params;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const loop = (template.feedbackLoops || []).find(l => l._id && l._id.toString() === loopId);
    if (!loop) {
      return res.status(404).json({ message: 'Loop not found' });
    }

    template.feedbackLoops = template.feedbackLoops.filter(l => l._id && l._id.toString() !== loopId);
    await template.save();

    // Delete Dependency entity
    await Dependency.deleteOne({
      templateId,
      sourceActivity: loop.sourceActivity,
      destinationActivity: loop.destinationActivity,
      dependencyType: 'Loop'
    });

    return res.json({ message: 'Loop deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete template loop', error: error.message });
  }
};

// CREATE Project Loop
export const createProjectLoop = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sourceActivity, destinationActivity, loopConfiguration } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Prevent duplicate loop edges
    const duplicate = (project.feedbackLoops || []).some(
      l => l.sourceActivity === sourceActivity.toString() && l.destinationActivity === destinationActivity.toString()
    );
    if (duplicate) {
      return res.status(400).json({ message: 'Loop connection already exists between these activities.' });
    }

    const loopId = new mongoose.Types.ObjectId();
    const newLoop = {
      _id: loopId,
      sourceActivity: sourceActivity.toString(),
      destinationActivity: destinationActivity.toString(),
      dependencyType: 'Loop',
      loopFlag: true,
      loopConfiguration: {
        maxIterations: loopConfiguration?.maxIterations || 5,
        expectedAvgIterations: loopConfiguration?.expectedAvgIterations || 2,
        isMandatory: loopConfiguration?.isMandatory || false
      }
    };

    project.feedbackLoops.push(newLoop);
    await project.save();

    await ensureDependenciesExist(projectId, 'project');
    await Dependency.create({
      projectId,
      sourceActivity: sourceActivity.toString(),
      destinationActivity: destinationActivity.toString(),
      dependencyType: 'Loop',
      loopFlag: true,
      loopConfiguration: newLoop.loopConfiguration,
      createdBy: req.user?._id
    });

    // Recalculate ML Prediction when project loops change
    const predictionResult = await runMLPrediction(projectId);

    // Broadcast update
    global.io?.to(projectId.toString()).emit('activity-updated', {
      project: predictionResult.project,
      topDrivers: predictionResult.topDrivers,
      recommendations: predictionResult.recommendations
    });

    return res.status(201).json(newLoop);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create project loop', error: error.message });
  }
};

// UPDATE Project Loop
export const updateProjectLoop = async (req, res) => {
  try {
    const { projectId, loopId } = req.params;
    const { loopConfiguration } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const loopIndex = project.feedbackLoops.findIndex(l => l._id && l._id.toString() === loopId);
    if (loopIndex === -1) {
      return res.status(404).json({ message: 'Loop not found' });
    }

    const targetLoop = project.feedbackLoops[loopIndex];
    targetLoop.loopConfiguration = {
      maxIterations: loopConfiguration?.maxIterations !== undefined ? loopConfiguration.maxIterations : targetLoop.loopConfiguration.maxIterations,
      expectedAvgIterations: loopConfiguration?.expectedAvgIterations !== undefined ? loopConfiguration.expectedAvgIterations : targetLoop.loopConfiguration.expectedAvgIterations,
      isMandatory: loopConfiguration?.isMandatory !== undefined ? loopConfiguration.isMandatory : targetLoop.loopConfiguration.isMandatory
    };

    project.feedbackLoops[loopIndex] = targetLoop;
    project.markModified('feedbackLoops');
    await project.save();

    // Sync Dependency entity
    await Dependency.findOneAndUpdate(
      {
        projectId,
        sourceActivity: targetLoop.sourceActivity,
        destinationActivity: targetLoop.destinationActivity,
        dependencyType: 'Loop'
      },
      { loopConfiguration: targetLoop.loopConfiguration }
    );

    // Recalculate predictions
    const predictionResult = await runMLPrediction(projectId);

    // Broadcast update
    global.io?.to(projectId.toString()).emit('activity-updated', {
      project: predictionResult.project,
      topDrivers: predictionResult.topDrivers,
      recommendations: predictionResult.recommendations
    });

    return res.json(targetLoop);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update project loop', error: error.message });
  }
};

// DELETE Project Loop
export const deleteProjectLoop = async (req, res) => {
  try {
    const { projectId, loopId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const loop = (project.feedbackLoops || []).find(l => l._id && l._id.toString() === loopId);
    if (!loop) {
      return res.status(404).json({ message: 'Loop not found' });
    }

    project.feedbackLoops = project.feedbackLoops.filter(l => l._id && l._id.toString() !== loopId);
    await project.save();

    // Delete Dependency entity
    await Dependency.deleteOne({
      projectId,
      sourceActivity: loop.sourceActivity,
      destinationActivity: loop.destinationActivity,
      dependencyType: 'Loop'
    });

    // Recalculate predictions
    const predictionResult = await runMLPrediction(projectId);

    // Broadcast update
    global.io?.to(projectId.toString()).emit('activity-updated', {
      project: predictionResult.project,
      topDrivers: predictionResult.topDrivers,
      recommendations: predictionResult.recommendations
    });

    return res.json({ message: 'Loop deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete project loop', error: error.message });
  }
};
