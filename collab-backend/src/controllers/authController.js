import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import ProjectMember from '../models/ProjectMember.js';
import Invitation from '../models/Invitation.js';
import Project from '../models/Project.js';

// Helper: Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretnavalpmiskey123', {
    expiresIn: '30d'
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      globalRole: role || 'VIEWER',
      role: role || 'VIEWER'
    });

    return res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Access denied: Your account has been deactivated.' });
    }

    return res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

export const inviteCollaborator = async (req, res) => {
  try {
    const { projectId, email, role } = req.body;
    
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

export const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;
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

export const rejectInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await Invitation.findOne({ token, status: 'Pending' });
    if (!invite) {
      return res.status(400).json({ message: 'Invitation not found' });
    }

    invite.status = 'Rejected';
    await invite.save();

    // Set ProjectMember status to Removed if exists
    await ProjectMember.findOneAndUpdate(
      { projectId: invite.projectId, userId: req.user._id },
      { status: 'Removed' }
    );

    return res.json({ message: 'Invitation rejected successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reject invitation', error: error.message });
  }
};

export const removeCollaborator = async (req, res) => {
  try {
    const { projectId, userId } = req.body;
    
    // Cannot remove Project Owner
    const member = await ProjectMember.findOne({ projectId, userId });
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

export const listCollaborators = async (req, res) => {
  try {
    const { projectId } = req.params;
    const members = await ProjectMember.find({ projectId })
      .populate('userId', 'name email globalRole')
      .sort({ joinedDate: -1 });

    return res.json(members);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list collaborators', error: error.message });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    // Return all projects for both PROJECT_MANAGER and VIEWER roles
    const projects = await Project.find().sort({ createdAt: -1 });
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
};
