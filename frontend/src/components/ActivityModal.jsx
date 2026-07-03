import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../utils/api.js';
import { Info, Lock, Save, X } from 'lucide-react';

function ActivityModal({ activity, onClose, onSaveSuccess }) {
  const socket = useSocket();
  
  // Form fields
  const [currentStatus, setCurrentStatus] = useState(activity.currentStatus);
  const [completionPercentage, setCompletionPercentage] = useState(activity.completionPercentage || 0);
  const [actualStartDate, setActualStartDate] = useState(activity.actualStartDate ? activity.actualStartDate.split('T')[0] : '');
  const [actualEndDate, setActualEndDate] = useState(activity.actualEndDate ? activity.actualEndDate.split('T')[0] : '');
  const [durationMonths, setDurationMonths] = useState(activity.durationMonths || 1.0);
  const [remainingMonths, setRemainingMonths] = useState(activity.remainingMonths || 1.0);
  const [remarks, setRemarks] = useState(activity.remarks || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket || !activity) return;

    // Request soft-lock from Socket.IO server
    socket.emit('edit-activity-start', {
      projectId: activity.projectId,
      activityId: activity._id
    });

    // Handle lock rejection (e.g. race condition)
    socket.on('activity-lock-rejected', ({ activityId, message }) => {
      if (activityId === activity._id) {
        setError(message);
      }
    });

    return () => {
      // Release soft-lock on unmount
      socket.emit('edit-activity-end', {
        projectId: activity.projectId,
        activityId: activity._id
      });
      socket.off('activity-lock-rejected');
    };
  }, [socket, activity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.put(`/activities/${activity._id}`, {
        currentStatus,
        completionPercentage: parseFloat(completionPercentage),
        actualStartDate: actualStartDate || null,
        actualEndDate: actualEndDate || null,
        durationMonths: parseFloat(durationMonths),
        remainingMonths: parseFloat(remainingMonths),
        remarks,
        version: activity.__v // Optimistic Lock Check!
      });

      onSaveSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update activity');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = ['NotStarted', 'InProgress', 'Completed', 'Delayed', 'Blocked', 'Cancelled'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D6DEE8] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#D6DEE8] bg-[#F7F9FC] flex items-center justify-between">
          <div>
            <h3 className="font-black text-[#12355B] text-sm font-outfit uppercase">{activity.name}</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Seq: {activity.sequenceNumber} | Category: {activity.category}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-[#12355B] text-xs font-bold"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 mx-6 mt-4 bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828] rounded-xl text-xs font-bold text-center flex items-center gap-1.5 justify-center">
            <Info size={12} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select 
                  value={currentStatus} 
                  onChange={(e) => {
                    setCurrentStatus(e.target.value);
                    if (e.target.value === 'Completed') {
                      setCompletionPercentage(100);
                      setRemainingMonths(0);
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                  disabled={!!error}
                >
                  {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completion %</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={completionPercentage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCompletionPercentage(val);
                    if (val === '100') {
                      setCurrentStatus('Completed');
                      setRemainingMonths(0);
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                  disabled={!!error || currentStatus === 'Completed'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actual Start Date</label>
                <input 
                  type="date" 
                  value={actualStartDate}
                  onChange={(e) => setActualStartDate(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                  disabled={!!error}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actual End Date</label>
                <input 
                  type="date" 
                  value={actualEndDate}
                  onChange={(e) => setActualEndDate(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                  disabled={!!error || currentStatus !== 'Completed'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration (Months)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                  disabled={!!error}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining Time (Months)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0"
                  value={remainingMonths}
                  onChange={(e) => setRemainingMonths(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                  disabled={!!error || currentStatus === 'Completed'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Change Reason</label>
              <textarea 
                rows="2"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Log delay reason or testing observations..."
                className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                disabled={!!error}
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#D6DEE8] flex justify-end gap-3 font-outfit">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-[#D6DEE8] hover:bg-slate-100 text-slate-650 text-xs font-bold rounded-lg transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || !!error}
              className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-navy-900/10 flex items-center gap-1.5"
            >
              <Save size={13} />
              {loading ? 'Saving...' : 'Apply Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ActivityModal;
