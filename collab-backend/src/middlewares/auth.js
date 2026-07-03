import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ProjectMember from '../models/ProjectMember.js';

// Predefined role to permission sets
export const ROLE_PERMISSIONS = {
  'PROJECT_MANAGER': [
    'project.create', 'project.read', 'project.update', 'project.delete',
    'template.create', 'template.read', 'template.update', 'template.delete',
    'activity.create', 'activity.update', 'activity.delete',
    'file.upload', 'file.delete',
    'report.generate',
    'comment.read', 'comment.create', 'comment.reply', 'comment.delete',
    'user.invite', 'user.remove'
  ],
  'VIEWER': [
    'project.read', 'report.generate', 'comment.read', 'comment.create', 'file.upload'
  ]
};

// Protect routes - JWT verification
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretnavalpmiskey123');
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.status === 'Inactive') {
      return res.status(401).json({ message: 'User not found or account is deactivated' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

// Check if user has permission in the project context
export const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      console.log(`[Permission Check] path: ${req.originalUrl}, params:`, req.params, `body:`, req.body);
      
      const userRole = req.user.role;
      const rolePerms = ROLE_PERMISSIONS[userRole] || [];
      
      if (rolePerms.includes(permission)) {
        req.projectRole = userRole; // Pass role to controller
        return next();
      }

      return res.status(403).json({ message: `Access denied: Missing permission '${permission}'` });
    } catch (error) {
      return res.status(500).json({ message: 'Permission middleware error', error: error.message });
    }
  };
};

// Check if user has one of the specified roles
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, login required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied: Required role is one of [${roles.join(', ')}]` });
    }
    next();
  };
};
