import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  RotateCcw, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Play, 
  User, 
  ArrowRight, 
  Maximize2,
  ListCollapse
} from 'lucide-react';

const ZOOM_LEVELS = {
  daily: { label: 'Daily', pixelsPerDay: 48 },
  weekly: { label: 'Weekly', pixelsPerDay: 10.5 },
  monthly: { label: 'Monthly', pixelsPerDay: 3.3 },
  quarterly: { label: 'Quarterly', pixelsPerDay: 1.3 },
  yearly: { label: 'Yearly', pixelsPerDay: 0.4 }
};

const STATUS_CONFIG = {
  NotStarted: { 
    bg: 'bg-slate-200 border-slate-350', 
    text: 'text-slate-650', 
    label: 'Not Started',
    icon: Clock,
    color: '#94a3b8'
  },
  InProgress: { 
    bg: 'bg-[#3b82f6]/80 border-blue-400', 
    text: 'text-blue-800', 
    label: 'In Progress',
    icon: Play,
    color: '#3b82f6'
  },
  Completed: { 
    bg: 'bg-[#10b981]/85 border-emerald-500', 
    text: 'text-emerald-800', 
    label: 'Completed',
    icon: CheckCircle,
    color: '#10b981'
  },
  Delayed: { 
    bg: 'bg-[#ef4444]/85 border-red-500', 
    text: 'text-red-850', 
    label: 'Delayed',
    icon: AlertTriangle,
    color: '#ef4444'
  },
  Blocked: { 
    bg: 'bg-purple-650/80 border-purple-500', 
    text: 'text-purple-800', 
    label: 'Blocked',
    icon: AlertTriangle,
    color: '#a855f7'
  },
  Cancelled: { 
    bg: 'bg-slate-400/80 border-slate-450', 
    text: 'text-slate-800', 
    label: 'Cancelled',
    icon: Clock,
    color: '#64748b'
  }
};

function GanttChart({ project, activities, onEditActivity }) {
  const outerContainerRef = useRef(null);
  const [zoom, setZoom] = useState('monthly');
  const [pixelsPerDay, setPixelsPerDay] = useState(3.3);
  const [containerWidth, setContainerWidth] = useState(800);
  
  const [hoveredTask, setHoveredTask] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  if (!project || !activities || activities.length === 0) {
    return (
      <div className="p-6 text-center text-slate-550 italic bg-white border border-[#D6DEE8] rounded-2xl shadow-sm">
        No activities to display in Gantt.
      </div>
    );
  }

  // Calculate container width on resize (task panel width is 260px)
  useEffect(() => {
    if (!outerContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(Math.max(300, entry.contentRect.width - 260));
      }
    });
    resizeObserver.observe(outerContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute timeline range boundaries based on project dates and padding (padded according to zoom level)
  const { timelineStart, timelineEnd } = useMemo(() => {
    const start = new Date(project.startDate);
    const end = new Date(project.expectedEndDate);
    
    let padStartDays = 15;
    let padEndDays = 30;
    
    if (zoom === 'daily') {
      padStartDays = 5;
      padEndDays = 10;
    } else if (zoom === 'weekly') {
      padStartDays = 14;
      padEndDays = 30;
    } else if (zoom === 'monthly') {
      padStartDays = 30;
      padEndDays = 90;
    } else if (zoom === 'quarterly') {
      padStartDays = 90;
      padEndDays = 180;
    } else if (zoom === 'yearly') {
      padStartDays = 180;
      padEndDays = 365;
    }
    
    const timelineStart = new Date(start.getTime() - padStartDays * 24 * 60 * 60 * 1000);
    const timelineEnd = new Date(end.getTime() + padEndDays * 24 * 60 * 60 * 1000); // 24h pad
    
    return { timelineStart, timelineEnd };
  }, [project.startDate, project.expectedEndDate, zoom]);

  const totalDays = useMemo(() => {
    return Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
  }, [timelineStart, timelineEnd]);

  // Generate timeline grids and headers
  const { primaryHeaders, secondaryHeaders, verticalLines, totalWidth } = useMemo(() => {
    const primary = [];
    const secondary = [];
    const gridLines = [];

    const start = new Date(timelineStart);
    const end = new Date(timelineEnd);

    if (zoom === 'daily') {
      let curr = new Date(start);
      let monthStart = new Date(curr);
      while (curr <= end) {
        const left = (curr.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
        const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;

        secondary.push({
          label: curr.getDate().toString(),
          left,
          width: pixelsPerDay,
          isWeekend
        });

        gridLines.push({ left, isWeekend });

        const nextDay = new Date(curr);
        nextDay.setDate(curr.getDate() + 1);

        if (nextDay.getMonth() !== curr.getMonth() || nextDay > end) {
          const monthWidth = (nextDay.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          const monthLeft = (monthStart.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          primary.push({
            label: monthStart.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
            left: monthLeft,
            width: monthWidth
          });
          monthStart = new Date(nextDay);
        }
        curr = nextDay;
      }
    } else if (zoom === 'weekly') {
      let curr = new Date(start);
      // Align to previous Monday
      const offset = (curr.getDay() + 6) % 7;
      curr.setDate(curr.getDate() - offset);
      let monthStart = new Date(curr);

      while (curr <= end) {
        const left = (curr.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
        const weekWidth = 7 * pixelsPerDay;

        secondary.push({
          label: curr.toLocaleDateString('default', { day: 'numeric', month: 'short' }),
          left,
          width: weekWidth
        });

        gridLines.push({ left });

        const nextWeek = new Date(curr);
        nextWeek.setDate(curr.getDate() + 7);

        if (nextWeek.getMonth() !== curr.getMonth() || nextWeek > end) {
          const monthWidth = (nextWeek.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          const monthLeft = (monthStart.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          primary.push({
            label: monthStart.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
            left: monthLeft,
            width: monthWidth
          });
          monthStart = new Date(nextWeek);
        }
        curr = nextWeek;
      }
    } else if (zoom === 'monthly') {
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      let yearStart = new Date(curr);

      while (curr <= end) {
        const left = (curr.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
        const nextMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
        const monthWidth = (nextMonth.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;

        secondary.push({
          label: curr.toLocaleDateString('default', { month: 'short' }),
          left,
          width: monthWidth
        });

        gridLines.push({ left });

        if (nextMonth.getFullYear() !== curr.getFullYear() || nextMonth > end) {
          const yearWidth = (nextMonth.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          const yearLeft = (yearStart.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          primary.push({
            label: yearStart.getFullYear().toString(),
            left: yearLeft,
            width: yearWidth
          });
          yearStart = new Date(nextMonth);
        }
        curr = nextMonth;
      }
    } else if (zoom === 'quarterly') {
      const qMonth = Math.floor(start.getMonth() / 3) * 3;
      let curr = new Date(start.getFullYear(), qMonth, 1);
      let yearStart = new Date(curr);

      while (curr <= end) {
        const left = (curr.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
        const nextQuarter = new Date(curr.getFullYear(), curr.getMonth() + 3, 1);
        const qWidth = (nextQuarter.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
        const qNum = Math.floor(curr.getMonth() / 3) + 1;

        secondary.push({
          label: `Q${qNum}`,
          left,
          width: qWidth
        });

        gridLines.push({ left });

        if (nextQuarter.getFullYear() !== curr.getFullYear() || nextQuarter > end) {
          const yearWidth = (nextQuarter.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          const yearLeft = (yearStart.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          primary.push({
            label: yearStart.getFullYear().toString(),
            left: yearLeft,
            width: yearWidth
          });
          yearStart = new Date(nextQuarter);
        }
        curr = nextQuarter;
      }
    } else if (zoom === 'yearly') {
      let curr = new Date(start.getFullYear(), 0, 1);
      let decadeStart = new Date(curr);

      while (curr <= end) {
        const left = (curr.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
        const nextYear = new Date(curr.getFullYear() + 1, 0, 1);
        const yearWidth = (nextYear.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;

        secondary.push({
          label: curr.getFullYear().toString(),
          left,
          width: yearWidth
        });

        gridLines.push({ left });

        const currDec = Math.floor(curr.getFullYear() / 10) * 10;
        const nextDec = Math.floor(nextYear.getFullYear() / 10) * 10;

        if (nextDec !== currDec || nextYear > end) {
          const decWidth = (nextYear.getTime() - decadeStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          const decLeft = (decadeStart.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
          primary.push({
            label: `${currDec} - ${currDec + 9}`,
            left: decLeft,
            width: decWidth
          });
          decadeStart = new Date(nextYear);
        }
        curr = nextYear;
      }
    }

    return { 
      primaryHeaders: primary, 
      secondaryHeaders: secondary, 
      verticalLines: gridLines, 
      totalWidth: totalDays * pixelsPerDay 
    };
  }, [timelineStart, timelineEnd, zoom, pixelsPerDay, totalDays]);

  // Compute Task Bar dimensions & coordinates
  const calculatedBars = useMemo(() => {
    return activities.map(act => {
      const pStart = act.plannedStartDate ? new Date(act.plannedStartDate) : new Date(project.startDate);
      const pEnd = act.plannedEndDate ? new Date(act.plannedEndDate) : new Date(project.expectedEndDate);
      const aStart = act.actualStartDate ? new Date(act.actualStartDate) : pStart;
      const aEnd = act.actualEndDate ? new Date(act.actualEndDate) : pEnd;

      const plannedLeft = (pStart.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
      const plannedWidth = Math.max(8, (pEnd.getTime() - pStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay);
      
      const actualLeft = (aStart.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay;
      const actualWidth = Math.max(8, (aEnd.getTime() - aStart.getTime()) / (24 * 60 * 60 * 1000) * pixelsPerDay);

      return {
        activity: act,
        plannedLeft,
        plannedWidth,
        actualLeft,
        actualWidth
      };
    });
  }, [activities, timelineStart, pixelsPerDay, project.startDate, project.expectedEndDate]);

  // Zoom actions
  const handleZoomIn = () => {
    const order = ['yearly', 'quarterly', 'monthly', 'weekly', 'daily'];
    const idx = order.indexOf(zoom);
    if (idx < order.length - 1) {
      const nextZoom = order[idx + 1];
      setZoom(nextZoom);
      setPixelsPerDay(ZOOM_LEVELS[nextZoom].pixelsPerDay);
    }
  };

  const handleZoomOut = () => {
    const order = ['yearly', 'quarterly', 'monthly', 'weekly', 'daily'];
    const idx = order.indexOf(zoom);
    if (idx > 0) {
      const nextZoom = order[idx - 1];
      setZoom(nextZoom);
      setPixelsPerDay(ZOOM_LEVELS[nextZoom].pixelsPerDay);
    }
  };

  const handleResetZoom = () => {
    setZoom('monthly');
    setPixelsPerDay(ZOOM_LEVELS.monthly.pixelsPerDay);
  };

  // Fit Width calculation
  const handleFitProjectWidth = () => {
    const fitPixelsPerDay = containerWidth / totalDays;
    let autoZoom = 'yearly';
    
    if (fitPixelsPerDay >= 25) autoZoom = 'daily';
    else if (fitPixelsPerDay >= 6.5) autoZoom = 'weekly';
    else if (fitPixelsPerDay >= 1.6) autoZoom = 'monthly';
    else if (fitPixelsPerDay >= 0.45) autoZoom = 'quarterly';
    
    setZoom(autoZoom);
    setPixelsPerDay(fitPixelsPerDay);
  };

  // Tooltip tracking
  const handleMouseMove = (e, act) => {
    const bounds = outerContainerRef.current?.getBoundingClientRect();
    const x = e.clientX - (bounds?.left || 0) + 12;
    const y = e.clientY - (bounds?.top || 0) + 12;
    setHoverPos({ x, y });
    setHoveredTask(act);
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-5 space-y-5 font-sans relative overflow-hidden" ref={outerContainerRef}>
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4 flex-shrink-0">
        <div>
          <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider font-outfit">Acquisition Timeline (Gantt)</h4>
          <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
            Dynamic scheduling and timeline visualization scaled to <span className="text-[#12355B] font-extrabold uppercase">{zoom}</span> level.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Zoom controls panel */}
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-sm gap-1">
            <button
              onClick={handleZoomIn}
              disabled={zoom === 'daily'}
              className="p-1.5 hover:bg-white rounded-lg text-slate-650 hover:text-[#12355B] disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              title="Zoom In Timeline"
            >
              <ZoomIn size={13} />
            </button>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 select-none min-w-[55px] text-center">
              {zoom}
            </span>
            <button
              onClick={handleZoomOut}
              disabled={zoom === 'yearly'}
              className="p-1.5 hover:bg-white rounded-lg text-slate-650 hover:text-[#12355B] disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              title="Zoom Out Timeline"
            >
              <ZoomOut size={13} />
            </button>
          </div>

          {/* Auto-fit and reset controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFitProjectWidth}
              className="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[9px] font-black text-slate-650 uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-colors"
              title="Fit entire project length to viewport width"
            >
              <Maximize2 size={11} className="text-blue-500" /> Fit Width
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-650 shadow-sm transition-colors"
              title="Reset Zoom to default Monthly"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Status Color Legend */}
          <div className="hidden xl:flex items-center gap-3.5 border-l border-slate-200 pl-4 text-[9px] font-bold text-slate-450 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300 ring-2 ring-slate-100" /> Planned
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6] ring-2 ring-blue-100" /> Active
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#10b981] ring-2 ring-emerald-100" /> Completed
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ef4444] ring-2 ring-red-100 animate-pulse" /> Delayed
            </div>
          </div>
        </div>
      </div>

      {/* 2. Timeline Grid Split Container */}
      <div className="overflow-auto max-h-[580px] border border-slate-150 rounded-2xl relative shadow-inner bg-slate-50/20 scrollbar-thin">
        <div className="relative min-w-max" style={{ width: `calc(260px + ${totalWidth}px)` }}>
          
          {/* Timeline Dual Header Row */}
          <div className="flex sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
            {/* Top-Left Corner Block (Sticky) */}
            <div className="w-[260px] sticky left-0 z-40 bg-white border-r border-slate-200 p-4 flex items-center justify-between shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                <ListCollapse size={13} className="text-[#12355B]" /> Activity Blueprint
              </span>
              <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-500 font-mono">
                {activities.length} STAGES
              </span>
            </div>

            {/* Time Grid Header Track */}
            <div className="relative h-14 select-none" style={{ width: `${totalWidth}px` }}>
              {/* Primary Headers (Year / Month name) */}
              {primaryHeaders.map((header, idx) => (
                <div
                  key={`p_${idx}`}
                  className="absolute top-0 h-7 border-r border-slate-150/70 border-b border-slate-100 bg-[#F8FAFC] text-[9px] font-black text-[#12355B] uppercase tracking-wider flex items-center pl-3 border-l border-slate-200 first:border-l-0"
                  style={{ left: `${header.left}px`, width: `${header.width}px` }}
                >
                  <Calendar size={10} className="mr-1.5 text-blue-500" />
                  <span className="truncate max-w-full pr-1.5">{header.label}</span>
                </div>
              ))}

              {/* Secondary Headers (Days / Weeks label) */}
              {secondaryHeaders.map((header, idx) => (
                <div
                  key={`s_${idx}`}
                  className={`absolute bottom-0 h-7 border-r border-slate-150/50 flex items-center justify-center text-[8.5px] font-bold ${
                    header.isWeekend ? 'bg-slate-100/60 text-slate-400 font-medium' : 'text-slate-500'
                  }`}
                  style={{ left: `${header.left}px`, width: `${header.width}px` }}
                >
                  {header.label}
                </div>
              ))}
            </div>
          </div>

          {/* Grid vertical background lines (drawn absolute) */}
          <div className="absolute top-14 bottom-0 z-0 pointer-events-none" style={{ left: '260px', width: `${totalWidth}px` }}>
            {verticalLines.map((line, idx) => (
              <div
                key={`line_${idx}`}
                className={`absolute top-0 bottom-0 border-r ${
                  line.isWeekend 
                    ? 'border-slate-200/50 bg-slate-50/20' 
                    : 'border-slate-150/30'
                }`}
                style={{ left: `${line.left}px`, width: zoom === 'daily' ? `${pixelsPerDay}px` : '1px' }}
              />
            ))}
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-150/60 relative z-10">
            {calculatedBars.map(({ activity, plannedLeft, plannedWidth, actualLeft, actualWidth }, idx) => {
              const statusCfg = STATUS_CONFIG[activity.currentStatus] || STATUS_CONFIG.NotStarted;
              const StatusIcon = statusCfg.icon;
              const isCritical = activity.isCriticalPath;
              const hasDelay = activity.currentDelayDays > 0;

              return (
                <div 
                  key={activity._id}
                  className="flex items-center hover:bg-slate-50/40 transition-colors group h-14"
                >
                  {/* Sticky Task Name Column */}
                  <div 
                    className="w-[260px] sticky left-0 z-20 bg-white border-r border-slate-200 p-3 flex items-center justify-between shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => onEditActivity && onEditActivity(activity)}
                    title="Click to view/edit activity detail info"
                  >
                    <div className="truncate max-w-[170px] pr-2">
                      <p className="text-[10.5px] font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {activity.name}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                        <StatusIcon size={9} style={{ color: statusCfg.color }} /> {statusCfg.label}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isCritical && (
                        <span className="text-[7.5px] bg-red-50 border border-red-200 text-red-650 px-1 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                          CRIT
                        </span>
                      )}
                      {hasDelay && (
                        <span className="text-[7.5px] bg-amber-50 border border-amber-200 text-[#B45309] px-1 py-0.5 rounded font-black font-mono">
                          +{activity.currentDelayDays}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task Bar Track Area */}
                  <div 
                    className="flex-1 relative h-full select-none cursor-pointer"
                    style={{ width: `${totalWidth}px` }}
                    onClick={() => onEditActivity && onEditActivity(activity)}
                    onMouseMove={(e) => handleMouseMove(e, activity)}
                    onMouseLeave={() => setHoveredTask(null)}
                  >
                    {/* 1. Planned Timeline bar (Thin Top Bar) */}
                    <div
                      className="absolute h-1.5 bg-slate-300 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                      style={{ 
                        left: `${plannedLeft}px`, 
                        width: `${plannedWidth}px`,
                        top: '12px'
                      }}
                      title={`Planned: ${new Date(activity.plannedStartDate).toLocaleDateString()} - ${new Date(activity.plannedEndDate).toLocaleDateString()}`}
                    />

                    {/* 2. Actual / Forecast Timeline bar (Thick Bottom Bar) */}
                    <div
                      className={`absolute h-4 rounded-lg border flex items-center justify-between px-1.5 shadow-sm transition-transform duration-200 hover:scale-[1.02] ${statusCfg.bg} ${
                        isCritical ? 'ring-2 ring-red-400 ring-offset-1 ring-offset-white' : ''
                      }`}
                      style={{ 
                        left: `${actualLeft}px`, 
                        width: `${actualWidth}px`,
                        bottom: '10px'
                      }}
                    >
                      {/* Percent Complete bar (Overlay) */}
                      {activity.progressPercent > 0 && activity.progressPercent < 100 && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 rounded-l-lg bg-black/10 pointer-events-none"
                          style={{ width: `${activity.progressPercent}%` }}
                        />
                      )}

                      {/* Display small label inside if bar is wide enough */}
                      {actualWidth > 65 && (
                        <span className={`text-[7.5px] font-black uppercase tracking-wider truncate pointer-events-none ${statusCfg.text}`}>
                          {activity.progressPercent || 0}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* 3. Floating Custom Tooltip */}
      {hoveredTask && (
        <div
          className="absolute z-50 bg-[#1E293B] text-white border border-[#334155] p-3.5 rounded-xl shadow-2xl text-[10px] space-y-2 pointer-events-none w-60 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
            <span className="font-extrabold uppercase text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
              {hoveredTask.sequenceNumber ? `STAGE #${hoveredTask.sequenceNumber}` : 'ACTIVITY'}
            </span>
            <span className="text-[7.5px] text-slate-400 font-extrabold font-mono uppercase">
              {hoveredTask.responsibleDepartment}
            </span>
          </div>

          <h5 className="font-black text-white uppercase text-[10px] leading-tight pt-0.5 line-clamp-2">
            {hoveredTask.name}
          </h5>

          <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[9px] pt-1 text-slate-350 font-bold border-t border-slate-800 mt-1">
            <span>Planned Start:</span>
            <span className="text-white text-right font-mono">
              {hoveredTask.plannedStartDate ? new Date(hoveredTask.plannedStartDate).toLocaleDateString('en-GB') : '-'}
            </span>

            <span>Planned End:</span>
            <span className="text-white text-right font-mono">
              {hoveredTask.plannedEndDate ? new Date(hoveredTask.plannedEndDate).toLocaleDateString('en-GB') : '-'}
            </span>

            <span>Actual Start:</span>
            <span className="text-white text-right font-mono">
              {hoveredTask.actualStartDate ? new Date(hoveredTask.actualStartDate).toLocaleDateString('en-GB') : '-'}
            </span>

            <span>Actual End:</span>
            <span className="text-white text-right font-mono">
              {hoveredTask.actualEndDate ? new Date(hoveredTask.actualEndDate).toLocaleDateString('en-GB') : '-'}
            </span>

            <span className="border-t border-slate-800 pt-1">Current Delay:</span>
            <span className={`text-right font-black border-t border-slate-800 pt-1 ${
              hoveredTask.currentDelayDays > 0 ? 'text-[#EF4444] animate-pulse' : 'text-white'
            }`}>
              {hoveredTask.currentDelayDays || 0} Days
            </span>

            <span>Progress:</span>
            <span className="text-white text-right font-black">
              {hoveredTask.progressPercent || 0}%
            </span>
            
            <span>Critical Path:</span>
            <span className={`text-right font-extrabold uppercase ${hoveredTask.isCriticalPath ? 'text-red-500' : 'text-slate-400'}`}>
              {hoveredTask.isCriticalPath ? 'Yes ⚠️' : 'No'}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}

export default GanttChart;
