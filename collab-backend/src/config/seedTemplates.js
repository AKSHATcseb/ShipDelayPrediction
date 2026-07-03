import Template from '../models/Template.js';

export const DEFAULT_TEMPLATES_DATA = {
  "Nomination Procurement": [
    {"name": "Cabinet Committee Approval (AoN)", "category": "Administrative", "sequenceNumber": 1, "dependencyList": [], "durationMonths": 6, "historicalRiskWeight": 35.0, "responsibleDepartment": "Cabinet Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Establishment of Staff Requirements", "category": "Technical", "sequenceNumber": 2, "dependencyList": [1], "durationMonths": 3, "historicalRiskWeight": 40.0, "responsibleDepartment": "Naval Staff", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Vendor Nomination Clearance", "category": "Administrative", "sequenceNumber": 3, "dependencyList": [2], "durationMonths": 2, "historicalRiskWeight": 25.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Commercial Negotiation (CNC)", "category": "Procurement", "sequenceNumber": 4, "dependencyList": [3], "durationMonths": 5, "historicalRiskWeight": 70.0, "responsibleDepartment": "CNC Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Contract Signing", "category": "Administrative", "sequenceNumber": 5, "dependencyList": [4], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "Ministry Secretariat", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Design Review & Approval", "category": "Technical", "sequenceNumber": 6, "dependencyList": [5], "durationMonths": 4, "historicalRiskWeight": 55.0, "responsibleDepartment": "Design Directorate", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Steel Cutting Ceremony", "category": "Construction", "sequenceNumber": 7, "dependencyList": [6], "durationMonths": 1, "historicalRiskWeight": 10.0, "responsibleDepartment": "Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Hull Fabrication & Assembly", "category": "Construction", "sequenceNumber": 8, "dependencyList": [7], "durationMonths": 18, "historicalRiskWeight": 60.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Propulsion System Fitting", "category": "Construction", "sequenceNumber": 9, "dependencyList": [8], "durationMonths": 6, "historicalRiskWeight": 50.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": 1},
    {"name": "Electrical Systems Layout", "category": "Construction", "sequenceNumber": 10, "dependencyList": [8], "durationMonths": 5, "historicalRiskWeight": 40.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": false, "parallelGroup": 1},
    {"name": "Combat Systems Integration", "category": "Technical", "sequenceNumber": 11, "dependencyList": [9, 10], "durationMonths": 8, "historicalRiskWeight": 75.0, "responsibleDepartment": "Integration Bureau", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Harbor Acceptance Trials (HAT)", "category": "Testing", "sequenceNumber": 12, "dependencyList": [11], "durationMonths": 3, "historicalRiskWeight": 45.0, "responsibleDepartment": "Inspection Commission", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Sea Acceptance Trials (SAT)", "category": "Testing", "sequenceNumber": 13, "dependencyList": [12], "durationMonths": 4, "historicalRiskWeight": 65.0, "responsibleDepartment": "Inspection Commission", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Final Inspection & Sign-off", "category": "Inspection", "sequenceNumber": 14, "dependencyList": [13], "durationMonths": 2, "historicalRiskWeight": 30.0, "responsibleDepartment": "Navy HQ", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Delivery & Commissioning", "category": "Delivery", "sequenceNumber": 15, "dependencyList": [14], "durationMonths": 1, "historicalRiskWeight": 10.0, "responsibleDepartment": "Navy HQ", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null}
  ],
  "Competitive Procurement": [
    {"name": "AoN Approval", "category": "Administrative", "sequenceNumber": 1, "dependencyList": [], "durationMonths": 6, "historicalRiskWeight": 35.0, "responsibleDepartment": "Cabinet Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "RFI Issue & Analysis", "category": "Documentation", "sequenceNumber": 2, "dependencyList": [1], "durationMonths": 3, "historicalRiskWeight": 20.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "RFP Formulation", "category": "Documentation", "sequenceNumber": 3, "dependencyList": [2], "durationMonths": 4, "historicalRiskWeight": 40.0, "responsibleDepartment": "Naval Staff", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "RFP Bidding Period", "category": "Procurement", "sequenceNumber": 4, "dependencyList": [3], "durationMonths": 5, "historicalRiskWeight": 30.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Technical Evaluation (TEC)", "category": "Technical", "sequenceNumber": 5, "dependencyList": [4], "durationMonths": 6, "historicalRiskWeight": 65.0, "responsibleDepartment": "TEC Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Commercial Bid Opening & L1 Determination", "category": "Procurement", "sequenceNumber": 6, "dependencyList": [5], "durationMonths": 2, "historicalRiskWeight": 25.0, "responsibleDepartment": "TOC Committee", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Commercial Negotiations (CNC)", "category": "Procurement", "sequenceNumber": 7, "dependencyList": [6], "durationMonths": 6, "historicalRiskWeight": 80.0, "responsibleDepartment": "CNC Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Contract Signing", "category": "Administrative", "sequenceNumber": 8, "dependencyList": [7], "durationMonths": 3, "historicalRiskWeight": 20.0, "responsibleDepartment": "Ministry Secretariat", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Detailed Design Review", "category": "Technical", "sequenceNumber": 9, "dependencyList": [8], "durationMonths": 5, "historicalRiskWeight": 50.0, "responsibleDepartment": "Design Directorate", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Equipment Procurement & Shipping", "category": "Procurement", "sequenceNumber": 10, "dependencyList": [9], "durationMonths": 12, "historicalRiskWeight": 70.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": false, "parallelGroup": 1},
    {"name": "Keel Laying", "category": "Construction", "sequenceNumber": 11, "dependencyList": [9], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": 1},
    {"name": "Block Assembly & Structural Fabrication", "category": "Construction", "sequenceNumber": 12, "dependencyList": [11], "durationMonths": 16, "historicalRiskWeight": 55.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Vessel Launching", "category": "Construction", "sequenceNumber": 13, "dependencyList": [12, 10], "durationMonths": 2, "historicalRiskWeight": 25.0, "responsibleDepartment": "Shipyard", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Outfitting & Piping", "category": "Construction", "sequenceNumber": 14, "dependencyList": [13], "durationMonths": 12, "historicalRiskWeight": 45.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Harbor Trials (HAT)", "category": "Testing", "sequenceNumber": 15, "dependencyList": [14], "durationMonths": 4, "historicalRiskWeight": 50.0, "responsibleDepartment": "Inspection Commission", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Sea Trials (SAT)", "category": "Testing", "sequenceNumber": 16, "dependencyList": [15], "durationMonths": 5, "historicalRiskWeight": 60.0, "responsibleDepartment": "Inspection Commission", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Delivery & Commissioning", "category": "Delivery", "sequenceNumber": 17, "dependencyList": [16], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "Navy HQ", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null}
  ],
  "Emergency Procurement": [
    {"name": "Emergency AoN Fast-track", "category": "Administrative", "sequenceNumber": 1, "dependencyList": [], "durationMonths": 1, "historicalRiskWeight": 15.0, "responsibleDepartment": "Cabinet Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Single Source RFQ Issue", "category": "Documentation", "sequenceNumber": 2, "dependencyList": [1], "durationMonths": 1, "historicalRiskWeight": 10.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Direct Contract Negotiations", "category": "Procurement", "sequenceNumber": 3, "dependencyList": [2], "durationMonths": 1, "historicalRiskWeight": 40.0, "responsibleDepartment": "CNC Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Contract Signing & Clearance", "category": "Administrative", "sequenceNumber": 4, "dependencyList": [3], "durationMonths": 1, "historicalRiskWeight": 15.0, "responsibleDepartment": "Ministry Secretariat", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Immediate Inventory Allocation", "category": "Procurement", "sequenceNumber": 5, "dependencyList": [4], "durationMonths": 2, "historicalRiskWeight": 35.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Fast-track Commissioning Trials", "category": "Testing", "sequenceNumber": 6, "dependencyList": [5], "durationMonths": 2, "historicalRiskWeight": 40.0, "responsibleDepartment": "Inspection Commission", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Handover & Active Deployment", "category": "Delivery", "sequenceNumber": 7, "dependencyList": [6], "durationMonths": 1, "historicalRiskWeight": 10.0, "responsibleDepartment": "Navy HQ", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null}
  ],
  "Indigenous Procurement": [
    {"name": "In-house Conception & Feasibility", "category": "Technical", "sequenceNumber": 1, "dependencyList": [], "durationMonths": 4, "historicalRiskWeight": 25.0, "responsibleDepartment": "Design Directorate", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Indigenous AoN Clearance", "category": "Administrative", "sequenceNumber": 2, "dependencyList": [1], "durationMonths": 6, "historicalRiskWeight": 30.0, "responsibleDepartment": "Cabinet Committee", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Detailed Ship Design & Blueprinting", "category": "Technical", "sequenceNumber": 3, "dependencyList": [2], "durationMonths": 8, "historicalRiskWeight": 60.0, "responsibleDepartment": "Design Directorate", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Local Vendor Development Approval", "category": "Procurement", "sequenceNumber": 4, "dependencyList": [3], "durationMonths": 5, "historicalRiskWeight": 55.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Indigenization Prototype Clearance", "category": "Technical", "sequenceNumber": 5, "dependencyList": [4], "durationMonths": 6, "historicalRiskWeight": 70.0, "responsibleDepartment": "Inspection Commission", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Local Material Supply Agreement", "category": "Procurement", "sequenceNumber": 6, "dependencyList": [5], "durationMonths": 3, "historicalRiskWeight": 40.0, "responsibleDepartment": "Procurement Dept", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Vessel Frame assembly", "category": "Construction", "sequenceNumber": 7, "dependencyList": [6], "durationMonths": 12, "historicalRiskWeight": 40.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Local Fitting & Integration", "category": "Construction", "sequenceNumber": 8, "dependencyList": [7], "durationMonths": 9, "historicalRiskWeight": 50.0, "responsibleDepartment": "Shipyard", "isMilestone": false, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Integrated Systems Trials", "category": "Testing", "sequenceNumber": 9, "dependencyList": [8], "durationMonths": 4, "historicalRiskWeight": 55.0, "responsibleDepartment": "Inspection Commission", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null},
    {"name": "Delivery & Induction", "category": "Delivery", "sequenceNumber": 10, "dependencyList": [9], "durationMonths": 2, "historicalRiskWeight": 15.0, "responsibleDepartment": "Navy HQ", "isMilestone": true, "isCriticalPath": true, "parallelGroup": null}
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
