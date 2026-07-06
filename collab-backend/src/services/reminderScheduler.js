import Reminder from '../models/Reminder.js';
import Notification from '../models/Notification.js';

export const startReminderScheduler = () => {
  console.log('[*] Background Reminder Scheduler active (checks every 30s)...');
  
  setInterval(async () => {
    try {
      const now = new Date();
      const reminders = await Reminder.find({ isSent: false });
      
      for (const rem of reminders) {
        const triggerTime = new Date(rem.date.getTime() - rem.timeBeforeMinutes * 60 * 1000);
        
        if (triggerTime <= now) {
          rem.isSent = true;
          await rem.save();
          
          // Create Notification
          const notif = await Notification.create({
            userId: rem.userId,
            type: 'reminder',
            content: `Reminder: ${rem.title}. ${rem.description || ''}`,
            projectId: rem.projectId || undefined,
            activityId: rem.activityId || undefined
          });
          
          // Emit via WebSocket to user's room
          global.io?.to(`user_${rem.userId.toString()}`).emit('notification-received', notif);
        }
      }
    } catch (err) {
      console.error('[!] Error in reminder scheduler loop:', err.message);
    }
  }, 30000);
};
