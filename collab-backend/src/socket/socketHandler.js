import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Lock map to store active locks
// Key: activityId (string) -> Value: { userId, userName, expiresAt }
const activeLocks = new Map();

// Global presence map
// Key: userId (string) -> Value: { socketId, name, email, status: 'Online'|'Offline', lastSeen }
const presenceMap = new Map();

export const getActivityLock = (activityId) => {
  const lock = activeLocks.get(activityId.toString());
  if (lock && lock.expiresAt > Date.now()) {
    return lock;
  }
  if (lock) {
    activeLocks.delete(activityId.toString()); // Clean expired lock
  }
  return null;
};

const socketHandler = (io) => {
  // Store global IO reference
  global.io = io;

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretnavalpmiskey123');
      const user = await User.findById(decoded.id).select('name email');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const userName = socket.user.name;
    const userEmail = socket.user.email;

    console.log(`Socket client connected: ${userName} (${socket.id})`);

    // 1. Manage Presence - Set User to Online
    presenceMap.set(userId, {
      socketId: socket.id,
      name: userName,
      email: userEmail,
      status: 'Online',
      lastSeen: new Date()
    });

    // 2. Join private user room for targeted notifications
    socket.join(`user_${userId}`);

    // Join Project Room
    socket.on('join-project', (data) => {
      const projectId = data?.projectId;
      if (!projectId) return;
      socket.join(projectId.toString());
      console.log(`User ${userName} joined project room: ${projectId}`);

      // Broadcast updated online presence to the project room
      broadcastPresenceList(io, projectId);
    });

    // Leave Project Room
    socket.on('leave-project', (data) => {
      const projectId = data?.projectId;
      if (!projectId) return;
      socket.leave(projectId.toString());
      console.log(`User ${userName} left project room: ${projectId}`);
      broadcastPresenceList(io, projectId);
    });

    // 3. Edit Activity Soft-Locking
    socket.on('edit-activity-start', ({ projectId, activityId }) => {
      const lockKey = activityId.toString();
      const existingLock = getActivityLock(lockKey);

      if (existingLock && existingLock.userId !== userId) {
        // Locked by someone else
        socket.emit('activity-lock-rejected', {
          activityId,
          message: `Already being edited by ${existingLock.userName}`
        });
      } else {
        // Grant/refresh lock for 30s
        const expiresAt = Date.now() + 30000;
        activeLocks.set(lockKey, {
          userId,
          userName,
          expiresAt
        });

        // Broadcast lock status
        io.to(projectId.toString()).emit('activity-locked', {
          activityId,
          userId,
          userName
        });
      }
    });

    socket.on('edit-activity-end', ({ projectId, activityId }) => {
      const lockKey = activityId.toString();
      const existingLock = activeLocks.get(lockKey);
      
      if (existingLock && existingLock.userId === userId) {
        activeLocks.delete(lockKey);
        io.to(projectId.toString()).emit('activity-unlocked', { activityId });
      }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${userName}`);
      
      // Update Presence to Offline
      presenceMap.set(userId, {
        socketId: null,
        name: userName,
        email: userEmail,
        status: 'Offline',
        lastSeen: new Date()
      });

      // Clear any locks held by this user
      for (let [actId, lock] of activeLocks.entries()) {
        if (lock.userId === userId) {
          activeLocks.delete(actId);
          // We don't have project context easily here, so we broadcast unlocked globally to active rooms
          io.emit('activity-unlocked', { activityId: actId });
        }
      }

      // Notify rooms of presence list update
      // Find all rooms this socket was in and broadcast updated presence
      socket.rooms.forEach((room) => {
        if (room !== socket.id && !room.startsWith('user_')) {
          broadcastPresenceList(io, room);
        }
      });
    });
  });
};

// Helper: Broadcast all active members' presence in a project
const broadcastPresenceList = (io, projectId) => {
  // Get all sockets currently in the project room
  const clients = io.sockets.adapter.rooms.get(projectId.toString());
  const onlineUsers = [];

  if (clients) {
    // Iterate over online user presences
    for (let [uId, pres] of presenceMap.entries()) {
      if (pres.status === 'Online' && clients.has(pres.socketId)) {
        onlineUsers.push({
          userId: uId,
          name: pres.name,
          email: pres.email,
          status: 'Online'
        });
      }
    }
  }

  // Broadcast the presence update
  io.to(projectId.toString()).emit('presence-list-updated', onlineUsers);
};

export default socketHandler;
