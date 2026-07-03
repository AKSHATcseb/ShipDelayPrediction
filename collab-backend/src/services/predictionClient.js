import Activity from '../models/Activity.js';
import Project from '../models/Project.js';

export const runMLPrediction = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    const activities = await Activity.find({ projectId }).sort({ sequenceNumber: 1 });

    // Map activity MongoDB ObjectId string to index reference in the sorted list
    const actIdToIdx = {};
    activities.forEach((act, idx) => {
      actIdToIdx[act._id.toString()] = idx;
    });

    const formattedActivities = activities.map((act) => {
      const deps = (act.dependencyList || [])
        .map((depId) => actIdToIdx[depId.toString()])
        .filter((idx) => idx !== undefined);

      return {
        name: act.name,
        category: act.category,
        sequence_number: act.sequenceNumber,
        parallel_group: act.parallelGroup,
        planned_start_date: act.plannedStartDate ? act.plannedStartDate.toISOString().split('T')[0] : null,
        planned_end_date: act.plannedEndDate ? act.plannedEndDate.toISOString().split('T')[0] : null,
        dependency_list: deps,
        historical_risk_weight: act.historicalRiskWeight || 50.0,
        is_milestone: act.isMilestone || false,
        is_critical_path: act.isCriticalPath || false,
        current_status: act.currentStatus,
        completion_percentage: act.completionPercentage || 0,
        current_delay_days: act.currentDelayDays || 0,
        actual_start_date: act.actualStartDate ? act.actualStartDate.toISOString().split('T')[0] : null,
        actual_end_date: act.actualEndDate ? act.actualEndDate.toISOString().split('T')[0] : null,
        remarks: act.remarks || ""
      };
    });

    const vendorRating = project.projectCost > 10000 ? 3.6 : 4.2;
    const plannedDurationMonths = Math.max(1, Math.round(
      (new Date(project.expectedEndDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24 * 30)
    ));

    const state = {
      project_name: project.projectName,
      project_id_code: project.projectIdCode,
      ship_type: project.shipType || 'Submarine',
      project_cost: project.projectCost || 5000.0,
      project_size: 3.0,
      priority: project.priority,
      start_date: project.startDate.toISOString().split('T')[0],
      planned_duration_months: plannedDurationMonths,
      technical_complexity: 8.0,
      technology_maturity: 6.5,
      foreign_dependency: true,
      vendor_rating: vendorRating,
      overall_progress_pct: project.overallProgress || 0.0,
      snapshot_date: new Date().toISOString().split('T')[0],
      activities: formattedActivities
    };

    const pythonServiceUrl = process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${pythonServiceUrl}/api/projects/predict/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python prediction service error: ${errorText}`);
    }

    const result = await response.json();

    // Save predictions back to MongoDB Project
    project.predictedDelayPct = result.delay_percentage;
    project.predictedDelayMonths = result.delay_months;
    project.predictedRiskCategory = result.risk_category;
    project.predictionConfidence = result.confidence;
    
    // Convert ML expected handover date string to Date object
    if (result.expected_completion_date) {
      project.expectedEndDate = new Date(result.expected_completion_date);
    }
    
    await project.save();

    // Dynamic Activity-level risk update based on project prediction
    for (let act of activities) {
      if (act.currentStatus === 'Completed') {
        act.predictedRisk = 'Low';
      } else if (['Delayed', 'Blocked'].includes(act.currentStatus)) {
        act.predictedRisk = result.risk_category;
      } else {
        if (act.historicalRiskWeight > 70.0) {
          act.predictedRisk = 'High';
        } else if (act.historicalRiskWeight > 40.0) {
          act.predictedRisk = 'Medium';
        } else {
          act.predictedRisk = 'Low';
        }
      }
      await act.save();
    }

    return {
      project,
      topDrivers: result.top_drivers || [],
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error(`ML Prediction Client Error: ${error.message}`);
    throw error;
  }
};
