import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Socket Handler
import socketHandler from './socket/socketHandler.js';

// Seed Helper
import User from './models/User.js';
import Project from './models/Project.js';
import ProjectMember from './models/ProjectMember.js';
import Activity from './models/Activity.js';
import Template from './models/Template.js';
import { seedDefaultTemplates } from './config/seedTemplates.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow any origin
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 file uploads

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', userRoutes);

// Fallback Route
app.get('/', (req, res) => {
  res.json({ message: 'Naval PMIS Collaborative Backend API is active.' });
});

// Seed default users if DB is empty
const seedDefaultUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding default system user accounts...');
      await User.create([
        {
          name: 'Akshat (Project Manager)',
          email: 'akshat@gov.in',
          password: '12345678',
          globalRole: 'PROJECT_MANAGER',
          role: 'PROJECT_MANAGER'
        },
        {
          name: 'Brijesh (Project Manager)',
          email: 'brijesh@gov.in',
          password: '12345678',
          globalRole: 'PROJECT_MANAGER',
          role: 'PROJECT_MANAGER'
        },
        {
          name: 'Vishank (Viewer)',
          email: 'vishank@gov.in',
          password: '12345678',
          globalRole: 'VIEWER',
          role: 'VIEWER'
        },
        {
          name: 'Mradul (Viewer)',
          email: 'mradul@gov.in',
          password: '12345678',
          globalRole: 'VIEWER',
          role: 'VIEWER'
        }
      ]);
      console.log('Default accounts seeded: akshat@gov.in, brijesh@gov.in, vishank@gov.in, mradul@gov.in (password: 12345678)');
    }

    const adminRoleCount = await User.countDocuments({ role: 'ADMIN' });
    if (adminRoleCount === 0) {
      console.log('Seeding default User Administrator account...');
      await User.create({
        name: 'System Admin',
        email: 'useradmin@gov.in',
        password: '12345678',
        globalRole: 'ADMIN',
        role: 'ADMIN'
      });
      console.log('Default User Administrator account seeded: useradmin@gov.in (password: 12345678)');
    }

    const pmUser = await User.findOne({ email: 'akshat@gov.in' });
    if (pmUser) {
      await seedDefaultTemplates(pmUser._id);
    }

    // Default project seeding disabled
    console.log('Automatic project seeding is disabled.');
  } catch (err) {
    console.error(`Error seeding database: ${err.message}`);
  }
};

// Initialize Sockets
socketHandler(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server listening in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  await seedDefaultUsers();
});
