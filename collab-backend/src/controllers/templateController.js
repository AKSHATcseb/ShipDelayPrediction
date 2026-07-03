import Template from '../models/Template.js';

// List all templates
export const getTemplates = async (req, res) => {
  try {
    const { includeArchived } = req.query;
    const filter = {};
    if (includeArchived !== 'true') {
      filter.isArchived = false;
    }
    const templates = await Template.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
};

// Get single template details
export const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id).populate('createdBy', 'name email');
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch template details', error: error.message });
  }
};

// Create a template (Admin only)
export const createTemplate = async (req, res) => {
  try {
    const { name, description, activities, feedbackLoops } = req.body;

    const templateExists = await Template.findOne({ name });
    if (templateExists) {
      return res.status(400).json({ message: 'Template name already exists' });
    }

    // Validate sequence numbers and dependency lists
    if (activities && Array.isArray(activities)) {
      for (const act of activities) {
        if (!act.name || act.sequenceNumber === undefined) {
          return res.status(400).json({ message: 'Each activity template must have a name and sequenceNumber' });
        }
      }
    }

    const template = await Template.create({
      name,
      description,
      activities: activities || [],
      feedbackLoops: feedbackLoops || [],
      createdBy: req.user._id
    });

    return res.status(201).json(template);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create template', error: error.message });
  }
};

// Update a template (Admin only)
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, activities, feedbackLoops } = req.body;

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if new name conflicts with other templates
    if (name && name !== template.name) {
      const nameConflict = await Template.findOne({ name });
      if (nameConflict) {
        return res.status(400).json({ message: 'Template name already exists' });
      }
      template.name = name;
    }

    if (description !== undefined) template.description = description;
    if (activities !== undefined) template.activities = activities;
    if (feedbackLoops !== undefined) template.feedbackLoops = feedbackLoops;

    await template.save();
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update template', error: error.message });
  }
};

// Soft delete/Archive template (Admin only)
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.isArchived = true;
    await template.save();

    return res.json({ message: 'Template archived successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to archive template', error: error.message });
  }
};
