import React from 'react';
import api from '../utils/api.js';
import { BellRing, Check, ShieldAlert, User, Play, MessageSquare } from 'lucide-react';

function NotificationCenter({ notifications, setNotifications, onClose }) {
  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read/all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type) => {
    switch (type) {
      case 'mention':
        return <MessageSquare size={11} className="stroke-[2.5]" />;
      case 'assigned':
        return <User size={11} className="stroke-[2.5]" />;
      case 'activity_ready':
        return <Play size={11} className="fill-current stroke-[2.5]" />;
      default:
        return <ShieldAlert size={11} className="stroke-[2.5]" />;
    }
  };

  const getIconClass = (type) => {
    switch (type) {
      case 'mention':
        return 'bg-[#E8EFF5] text-[#2F6690]';
      case 'assigned':
        return 'bg-amber-50 text-[#D97706]';
      case 'activity_ready':
        return 'bg-emerald-50 text-[#2D6A4F]';
      default:
        return 'bg-rose-50 text-[#C62828]';
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white border border-[#D6DEE8] rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="p-4 border-b border-[#D6DEE8] bg-[#F7F9FC] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing size={14} className="text-[#12355B] stroke-[2.5]" />
          <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider font-outfit">Notifications</h4>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#C62828] text-white text-[8px] font-black">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="text-[9px] font-black text-[#2F6690] hover:text-[#12355B] uppercase tracking-wider flex items-center gap-0.5"
          >
            <Check size={10} className="stroke-[2.5]" /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-[#D6DEE8]/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n._id}
              onClick={() => !n.isRead && handleMarkAsRead(n._id)}
              className={`p-3.5 transition-colors cursor-pointer text-left ${
                n.isRead 
                  ? 'bg-white hover:bg-slate-50' 
                  : 'bg-[#E8EFF5]/30 hover:bg-[#E8EFF5]/50 border-l-2 border-[#12355B]'
              }`}
            >
              <div className="flex gap-2.5 items-start">
                <div className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${getIconClass(n.type)}`}>
                  {getIcon(n.type)}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{n.content}</p>
                  <p className="text-[8px] text-slate-455 font-bold mt-1">
                    {new Date(n.createdAt).toLocaleDateString('en-GB')} at {new Date(n.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-2 border-t border-[#D6DEE8] bg-[#F7F9FC] flex justify-center">
        <button 
          onClick={onClose}
          className="text-[10px] text-slate-500 hover:text-[#12355B] font-bold uppercase tracking-wider"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default NotificationCenter;
