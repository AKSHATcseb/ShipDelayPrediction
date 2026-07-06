import Template from '../models/Template.js';

export const DEFAULT_TEMPLATES_DATA = {
  "DAP Nomination Shipbuilding": [
    {"name": "Acceptance of Necessity (AoN)", "category": "Administrative", "sequenceNumber": 1, "dependencyList": [], "durationMonths": 3, "historicalRiskWeight": 35.0, "responsibleDepartment": "Cabinet Committee/MoD", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Promulgation of PSR", "category": "Technical", "sequenceNumber": 2, "dependencyList": [1], "durationMonths": 18, "historicalRiskWeight": 40.0, "responsibleDepartment": "SHQ", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Completion of Preliminary/Functional Design", "category": "Technical", "sequenceNumber": 3, "dependencyList": [2], "durationMonths": 3, "historicalRiskWeight": 45.0, "responsibleDepartment": "SHQ/Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Preliminary Build Specification (PBS)", "category": "Technical", "sequenceNumber": 4, "dependencyList": [3], "durationMonths": 6, "historicalRiskWeight": 35.0, "responsibleDepartment": "SHQ/Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Build Strategy Submission & Approval", "category": "Technical", "sequenceNumber": 5, "dependencyList": [4], "durationMonths": 3, "historicalRiskWeight": 30.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Budgetary & Estimated Cost Submission", "category": "Administrative", "sequenceNumber": 6, "dependencyList": [5], "durationMonths": 6, "historicalRiskWeight": 30.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Contract Negotiations (CNC Stage) & CFA Approval", "category": "Procurement", "sequenceNumber": 7, "dependencyList": [6], "durationMonths": 2, "historicalRiskWeight": 65.0, "responsibleDepartment": "CNC Committee/MoD", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Signing of Contract", "category": "Administrative", "sequenceNumber": 8, "dependencyList": [7], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "SHQ/Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Detailed Design & Equipment Selection", "category": "Technical", "sequenceNumber": 9, "dependencyList": [8], "durationMonths": 6, "historicalRiskWeight": 50.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Steel Cutting (Hull Construction Start)", "category": "Construction", "sequenceNumber": 10, "dependencyList": [9], "durationMonths": 1, "historicalRiskWeight": 10.0, "responsibleDepartment": "Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Hull Fabrication & Assembly", "category": "Construction", "sequenceNumber": 11, "dependencyList": [10], "durationMonths": 18, "historicalRiskWeight": 55.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Launching of the Vessel", "category": "Construction", "sequenceNumber": 12, "dependencyList": [11], "durationMonths": 2, "historicalRiskWeight": 25.0, "responsibleDepartment": "Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Outfitting & Piping Integration", "category": "Construction", "sequenceNumber": 13, "dependencyList": [12], "durationMonths": 12, "historicalRiskWeight": 40.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Harbor Acceptance Trials (HAT)", "category": "Testing", "sequenceNumber": 14, "dependencyList": [13], "durationMonths": 4, "historicalRiskWeight": 45.0, "responsibleDepartment": "Inspection Commission", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Sea Acceptance Trials (SAT)", "category": "Testing", "sequenceNumber": 15, "dependencyList": [14], "durationMonths": 5, "historicalRiskWeight": 60.0, "responsibleDepartment": "Inspection Commission", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Delivery & Commissioning", "category": "Delivery", "sequenceNumber": 16, "dependencyList": [15], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "Navy HQ", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null}
  ],
  "DAP Competitive Shipbuilding": [
    {"name": "Conception, OSR & Concept Design", "category": "Technical", "sequenceNumber": 1, "dependencyList": [], "durationMonths": 4, "historicalRiskWeight": 25.0, "responsibleDepartment": "Design Directorate", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Acceptance of Necessity (AoN) Approval", "category": "Administrative", "sequenceNumber": 2, "dependencyList": [1], "durationMonths": 6, "historicalRiskWeight": 35.0, "responsibleDepartment": "Cabinet Committee/MoD", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "RFI Issue & Analysis", "category": "Documentation", "sequenceNumber": 3, "dependencyList": [2], "durationMonths": 3, "historicalRiskWeight": 20.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "RFP Formulation & Capacity Assessment", "category": "Documentation", "sequenceNumber": 4, "dependencyList": [3], "durationMonths": 4, "historicalRiskWeight": 30.0, "responsibleDepartment": "Naval Staff", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Solicitation of Offers (RFP Bidding)", "category": "Procurement", "sequenceNumber": 5, "dependencyList": [4], "durationMonths": 5, "historicalRiskWeight": 35.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Technical & Financial Evaluation (TEC & FPET)", "category": "Technical", "sequenceNumber": 6, "dependencyList": [5], "durationMonths": 6, "historicalRiskWeight": 60.0, "responsibleDepartment": "TEC/FPET Committees", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Commercial Negotiations (CNC)", "category": "Procurement", "sequenceNumber": 7, "dependencyList": [6], "durationMonths": 6, "historicalRiskWeight": 75.0, "responsibleDepartment": "CNC Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Award & Contract Signing", "category": "Administrative", "sequenceNumber": 8, "dependencyList": [7], "durationMonths": 2, "historicalRiskWeight": 20.0, "responsibleDepartment": "SHQ/Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Detailed Design & Equipment Order", "category": "Technical", "sequenceNumber": 9, "dependencyList": [8], "durationMonths": 6, "historicalRiskWeight": 50.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Keel Laying Ceremony", "category": "Construction", "sequenceNumber": 10, "dependencyList": [9], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Block Assembly & Fabrication", "category": "Construction", "sequenceNumber": 11, "dependencyList": [10], "durationMonths": 16, "historicalRiskWeight": 55.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Launching of the Vessel", "category": "Construction", "sequenceNumber": 12, "dependencyList": [11], "durationMonths": 2, "historicalRiskWeight": 25.0, "responsibleDepartment": "Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Outfitting & Piping", "category": "Construction", "sequenceNumber": 13, "dependencyList": [12], "durationMonths": 12, "historicalRiskWeight": 45.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Harbor Acceptance Trials (HAT)", "category": "Testing", "sequenceNumber": 14, "dependencyList": [13], "durationMonths": 4, "historicalRiskWeight": 45.0, "responsibleDepartment": "Inspection Commission", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Sea Acceptance Trials (SAT)", "category": "Testing", "sequenceNumber": 15, "dependencyList": [14], "durationMonths": 5, "historicalRiskWeight": 60.0, "responsibleDepartment": "Inspection Commission", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Delivery & Commissioning", "category": "Delivery", "sequenceNumber": 16, "dependencyList": [15], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "Navy HQ", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null}
  ]
};

export const seedDefaultTemplates = async (adminUserId) => {
  try {
    const templateCount = await Template.countDocuments();
    if (templateCount === 0) {
      console.log('Seeding default project templates...');
      for (const [name, activities] of Object.entries(DEFAULT_TEMPLATES_DATA)) {
        await Template.create({
          name,
          description: `Standard lifecycle workflow for ${name}.`,
          activities,
          createdBy: adminUserId,
          isArchived: false
        });
      }
      console.log('Project templates seeded successfully.');
    }
  } catch (error) {
    console.error(`Error seeding templates: ${error.message}`);
  }
};
