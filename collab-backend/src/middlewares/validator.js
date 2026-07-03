import Joi from 'joi';

// Helper to format validation errors
const formatError = (error) => {
  return error.details.map((d) => d.message).join(', ');
};

export const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: formatError(error) });
  next();
};

export const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    globalRole: Joi.string().valid('Admin', 'User')
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: formatError(error) });
  next();
};

export const validateProject = (req, res, next) => {
  const schema = Joi.object({
    projectName: Joi.string().required(),
    projectIdCode: Joi.string().required(),
    shipName: Joi.string().allow('', null),
    shipClass: Joi.string().allow('', null),
    shipType: Joi.string().required(),
    projectCost: Joi.number().min(0),
    customer: Joi.string().allow('', null),
    startDate: Joi.date().required(),
    expectedEndDate: Joi.date().optional(),
    templateId: Joi.string().optional(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
    currentStatus: Joi.string().valid('Active', 'Completed', 'OnHold')
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: formatError(error) });
  next();
};

export const validateActivityUpdate = (req, res, next) => {
  const schema = Joi.object({
    currentStatus: Joi.string().valid('NotStarted', 'InProgress', 'Completed', 'Delayed', 'Blocked', 'Cancelled'),
    completionPercentage: Joi.number().min(0).max(100),
    actualStartDate: Joi.date().allow(null, ''),
    actualEndDate: Joi.date().allow(null, ''),
    durationMonths: Joi.number().min(0.1),
    remainingMonths: Joi.number().min(0),
    remarks: Joi.string().allow('', null),
    version: Joi.number().integer().required() // Version is required for optimistic concurrency check!
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: formatError(error) });
  next();
};

export const validateComment = (req, res, next) => {
  const schema = Joi.object({
    projectId: Joi.string().hex().length(24).required(),
    activityId: Joi.string().hex().length(24).allow(null, ''),
    content: Joi.string().required(),
    parentId: Joi.string().hex().length(24).allow(null, '')
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: formatError(error) });
  next();
};
