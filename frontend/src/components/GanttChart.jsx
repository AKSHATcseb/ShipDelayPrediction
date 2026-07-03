import React from 'react';

function GanttChart({ project, activities }) {
  if (!project || !activities || activities.length === 0) {
    return <div className="p-6 text-center text-slate-500 italic bg-white border border-[#D6DEE8] rounded-2xl shadow-sm">No activities to display in Gantt.</div>;
  }

  const projStart = new Date(project.startDate);
  const projEnd = new Date(project.expectedEndDate);
  const totalDuration = Math.max(1, projEnd.getTime() - projStart.getTime());

  const getPercentBounds = (startStr, endStr) => {
    if (!startStr || !endStr) return { left: 0, width: 0 };
    
    const start = new Date(startStr);
    const end = new Date(endStr);

    const offset = Math.max(0, start.getTime() - projStart.getTime());
    const span = Math.max(0, end.getTime() - start.getTime());

    const left = (offset / totalDuration) * 100;
    const width = (span / totalDuration) * 100;

    return { 
      left: Math.min(95, left), 
      width: Math.max(5, Math.min(100 - left, width)) 
    };
  };

  const statusColors = {
    NotStarted: 'bg-slate-300',
    InProgress: 'bg-[#2F6690]/80',
    Completed: 'bg-[#2D6A4F]/85',
    Delayed: 'bg-[#C62828]/85',
    Blocked: 'bg-purple-600/80',
    Cancelled: 'bg-slate-400'
  };

  // Generate headers representing months
  const totalMonths = Math.max(1, Math.round(totalDuration / (1000 * 60 * 60 * 24 * 30)));
  const monthHeaders = [];
  const startYear = projStart.getFullYear();
  const startMonth = projStart.getMonth();
  
  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(startYear, startMonth + i, 1);
    monthHeaders.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
  }

  return (
    <div className="bg-white border border-[#D6DEE8] p-6 rounded-2xl space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#D6DEE8] pb-3 flex-shrink-0">
        <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider">Acquisition Timeline (Gantt)</h4>
        <div className="flex gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-slate-300"></span> Planned</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-[#2F6690]"></span> Active</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-[#2D6A4F]"></span> Completed</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-[#C62828]"></span> Delayed</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px] space-y-4 relative">
          {/* Months Header Grid */}
          <div className="grid border-b border-[#D6DEE8] pb-2 text-[8px] font-black text-slate-500 uppercase tracking-wider" style={{ gridTemplateColumns: `repeat(${monthHeaders.length || 1}, minmax(0, 1fr))` }}>
            {monthHeaders.map((m, idx) => (
              <div key={idx} className="text-center border-l border-[#D6DEE8]/50 first:border-l-0">
                {m}
              </div>
            ))}
          </div>

          {/* Activities Gantt Bars */}
          <div className="space-y-3 pt-1">
            {activities.map((act) => {
              const planned = getPercentBounds(act.plannedStartDate, act.plannedEndDate);
              const actual = getPercentBounds(act.actualStartDate || act.plannedStartDate, act.actualEndDate || act.plannedEndDate);

              return (
                <div key={act._id} className="flex items-center gap-4 group">
                  <div className="w-32 flex-shrink-0 text-left">
                    <p className="text-[10px] font-bold text-slate-800 truncate group-hover:text-[#12355B] transition-colors" title={act.name}>
                      {act.name}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{act.currentStatus}</p>
                  </div>

                  {/* Shaded bars track area */}
                  <div className="flex-1 h-7 bg-slate-50 border border-[#D6DEE8]/50 rounded-lg relative overflow-hidden">
                    {/* Planned Bar */}
                    <div 
                      className="absolute h-2 bg-slate-350 rounded top-1"
                      style={{ left: `${planned.left}%`, width: `${planned.width}%` }}
                    />
                    {/* Actual / Forecast Bar */}
                    <div 
                      className={`absolute h-2.5 rounded bottom-1 shadow-sm transition-all duration-300 ${statusColors[act.currentStatus]}`}
                      style={{ left: `${actual.left}%`, width: `${actual.width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GanttChart;
