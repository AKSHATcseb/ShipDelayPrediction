import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

function PresenceIndicator({ projectId }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !projectId) return;

    // Join room and trigger list sync
    socket.emit('join-project', { projectId });

    socket.on('presence-list-updated', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.emit('leave-project', { projectId });
      socket.off('presence-list-updated');
    };
  }, [socket, projectId]);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2 overflow-hidden mr-2">
        {onlineUsers.map((u) => {
          // Generate deterministic background color based on name
          const colors = [
            'bg-[#E8EFF5] text-[#12355B] border-[#D6DEE8]',
            'bg-[#2D6A4F]/10 text-[#2D6A4F] border-[#2D6A4F]/20',
            'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20',
            'bg-purple-100 text-purple-800 border-purple-200',
            'bg-red-100 text-red-800 border-red-200'
          ];
          const colorIdx = u.name.charCodeAt(0) % colors.length;
          const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

          return (
            <div 
              key={u.userId}
              title={`${u.name} (Online)`}
              className={`inline-flex items-center justify-center h-7 w-7 rounded-full border text-[10px] font-black font-outfit uppercase shadow-sm ${colors[colorIdx]}`}
            >
              {initials}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center gap-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {onlineUsers.length} active now
        </span>
      </div>
    </div>
  );
}

export default PresenceIndicator;
