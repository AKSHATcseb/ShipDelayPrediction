import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { Edit2, Flag, Lock } from 'lucide-react';

function ActivityList({ activities, onEditActivity, projectRole }) {
  const [locks, setLocks] = useState({});
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('activity-locked', ({ activityId, userId, userName }) => {
      setLocks((prev) => ({
        ...prev,
        [activityId.toString()]: { userId, userName }
      }));
    });

    socket.on('activity-unlocked', ({ activityId }) => {
      setLocks((prev) => {
        const next = { ...prev };
        delete next[activityId.toString()];
        return next;
      });
    });

    return () => {
      socket.off('activity-locked');
      socket.off('activity-unlocked');
    };
  }, [socket]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB'); // dd-mm-yyyy format
  };

  const statusColors = {
    NotStarted: 'bg-slate-100 text-slate-600 border border-slate-200',
    InProgress: 'bg-[#2F6690]/10 text-[#2F6690] border border-[#2F6690]/25',
    Completed: 'bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/25',
    Delayed: 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/25',
    Blocked: 'bg-purple-100 text-purple-800 border border-purple-200',
    Cancelled: 'bg-slate-100 text-slate-400 border border-slate-200'
  };

  const riskColors = {
    Low: 'text-[#2D6A4F] font-bold',
    Medium: 'text-[#D97706] font-bold',
    High: 'text-[#C62828] font-bold',
    Critical: 'text-purple-800 font-extrabold'
  };

  return (
    <div className="bg-white border border-[#D6DEE8] rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-slate-700">
          <thead>
            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-[#F7F9FC] border-b border-[#D6DEE8]">
              <th className="px-5 py-3">Seq</th>
              <th className="px-5 py-3">Task Step</th>
              <th className="px-5 py-3">Dates (Planned / Actual)</th>
              <th className="px-5 py-3">Duration</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Progress</th>
              <th className="px-5 py-3">Remaining</th>
              <th className="px-5 py-3">Delay</th>
              <th className="px-5 py-3">Risk Tier</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6DEE8] text-xs">
            {activities.map((act) => {
              const lockInfo = locks[act._id.toString()];
              const isLocked = !!lockInfo;

              return (
                <tr 
                  key={act._id} 
                  className={`hover:bg-slate-50/50 transition-colors ${isLocked ? 'bg-amber-50/20' : ''}`}
                >
                  <td className="px-5 py-4 font-bold text-[#12355B]">{act.sequenceNumber}</td>
                  <td className="px-5 py-4">
                    <p className="font-extrabold text-[#12355B] flex items-center gap-1.5 font-outfit">
                      {act.isMilestone && <Flag size={10} className="text-[#2F6690] stroke-[2.5]" />}
                      {act.name}
                    </p>
                    <p className="text-[9px] text-slate-450 mt-0.5 font-semibold">
                      Dept: {act.assignedDepartment || 'General'} | Cat: {act.category}
                    </p>
                    
                    {/* Real-time lock alert */}
                    {isLocked && (
                      <p className="text-[9px] text-[#D97706] font-bold mt-1.5 flex items-center gap-1">
                        <Lock size={10} className="animate-pulse" />
                        {lockInfo.userName} is editing...
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 space-y-1">
                    <p className="text-[9px] text-slate-400 font-semibold">
                      Planned: {formatDate(act.plannedStartDate)} to {formatDate(act.plannedEndDate)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-600">
                      Actual: {formatDate(act.actualStartDate)} to {formatDate(act.actualEndDate)}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800">{act.durationMonths?.toFixed(1) || '1.0'}m</td>
                  <td className="px-5 py-4">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${statusColors[act.currentStatus]}`}>
                      {act.currentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-slate-100 border border-[#D6DEE8] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#12355B] h-1.5 rounded-full" style={{ width: `${act.completionPercentage || 0}%` }}></div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">{act.completionPercentage || 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-700">
                    {act.currentStatus === 'Completed' ? '0m' : `${act.remainingMonths?.toFixed(1) || '1.0'}m`}
                  </td>
                  <td className="px-5 py-4 font-black">
                    {act.currentDelayDays > 0 ? (
                      <span className="text-[#C62828] font-extrabold">+{act.currentDelayDays}d</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className={`px-5 py-4 text-[10px] ${riskColors[act.predictedRisk || 'Low']}`}>
                    {act.predictedRisk || 'Low'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {projectRole !== 'PROJECT_MANAGER' ? (
                      <span className="text-[10px] text-slate-400 font-bold italic uppercase tracking-wider pr-1">Read-Only</span>
                    ) : isLocked ? (
                      <button 
                        disabled
                        className="p-1.5 text-[#D97706] bg-amber-50 border border-[#D97706]/20 rounded-lg cursor-not-allowed"
                        title={`Locked by ${lockInfo.userName}`}
                      >
                        <Lock size={12} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => onEditActivity(act)}
                        className="p-1.5 text-slate-500 hover:text-[#12355B] bg-slate-50 hover:bg-slate-100 border border-[#D6DEE8] rounded-lg transition-all"
                        title="Edit Activity"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActivityList;
