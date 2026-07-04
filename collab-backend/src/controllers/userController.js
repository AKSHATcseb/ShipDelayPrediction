import User from '../models/User.js';

// List all users (Admin only)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// Create a new user (Project Manager only)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (role && !['PROJECT_MANAGER', 'VIEWER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be PROJECT_MANAGER, VIEWER, or ADMIN.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'VIEWER',
      globalRole: role || 'VIEWER',
      status: 'Active'
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};

// Update user details (Project Manager only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const emailConflict = await User.findOne({ email });
      if (emailConflict) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      user.email = email;
    }

    if (role && !['PROJECT_MANAGER', 'VIEWER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be PROJECT_MANAGER, VIEWER, or ADMIN.' });
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined) {
      user.role = role;
      user.globalRole = role;
    }
    if (status !== undefined) user.status = status;

    await user.save();
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

// Delete user (Project Manager only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting the main Project Manager sandbox account
    if (user.email === 'akshat@gov.in') {
      return res.status(403).json({ message: 'Cannot delete the main Project Manager sandbox account' });
    }

    await User.findByIdAndDelete(id);
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// Reset user password (Admin only)
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword; // Pre-save middleware hashes this automatically
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
};
