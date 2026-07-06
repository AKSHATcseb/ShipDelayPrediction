import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, List, Search, 
  Filter, Eye, Edit, Trash2, X, Flag, Users, Bell, AlertTriangle, 
  ClipboardList, Activity, ShieldAlert, CheckSquare, Sliders, Wrench, 
  CalendarDays, User, Paperclip, Send, Settings, CheckCircle, Play, Anchor, Info
} from 'lucide-react';

const CATEGORY_ICONS = {
  Project: Anchor,
  Milestone: Flag,
  Meeting: Users,
  Reminder: Bell,
  Deadline: AlertTriangle,
  Activity: ClipboardList,
  'Critical Activity': Activity,
  'Risk Review': ShieldAlert,
  Inspection: Search,
  Approval: CheckSquare,
  Testing: Sliders,
  Maintenance: Wrench,
  Holiday: CalendarDays,
  Personal: User
};

const CATEGORY_STYLES = {
  Project: { color: '#12355B', icon: 'Anchor' },
  Milestone: { color: '#D97706', icon: 'Flag' },
  Meeting: { color: '#2F6690', icon: 'Users' },
  Reminder: { color: '#6366F1', icon: 'Bell' },
  Deadline: { color: '#C62828', icon: 'AlertTriangle' },
  Activity: { color: '#475569', icon: 'ClipboardList' },
  'Critical Activity': { color: '#B91C1C', icon: 'Activity' },
  'Risk Review': { color: '#EA580C', icon: 'ShieldAlert' },
  Inspection: { color: '#059669', icon: 'Search' },
  Approval: { color: '#9333EA', icon: 'CheckSquare' },
  Testing: { color: '#2563EB', icon: 'Sliders' },
  Maintenance: { color: '#D97706', icon: 'Wrench' },
  Holiday: { color: '#0D9488', icon: 'CalendarDays' },
  Personal: { color: '#DB2777', icon: 'User' }
};

function CalendarPage({ onSelectProject, defaultProjectFilter = '', isWorkspaceMode = false }) {
  const { user } = useAuth();
  const socket = useSocket();

  const formatDateLocal = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  // Calendar Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day', 'agenda'
  
  // Data State
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState(defaultProjectFilter);
  const [selectedCategories, setSelectedCategories] = useState(Object.keys(CATEGORY_ICONS));
  const [selectedPriorities, setSelectedPriorities] = useState(['Low', 'Medium', 'High', 'Critical']);
  const [selectedStatuses, setSelectedStatuses] = useState(['Pending', 'Completed', 'Overdue']);
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Quick Add Event Form
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    projectId: defaultProjectFilter,
    start: '',
    end: '',
    priority: 'Medium',
    category: 'Meeting',
    isRecurring: false,
    recurrenceRule: { frequency: 'Weekly', interval: 1, count: 5 },
    linkedActivities: [],
    reminderSettings: { timeBeforeMinutes: 15, type: 'in-app' }
  });

  // Holiday Form
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'National' });

  // Event Comments & Attachments Form
  const [commentText, setCommentText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const projRes = await api.get('/auth/projects');
      setProjects(projRes.data);

      // Fetch all events
      let query = '';
      if (selectedProjectFilter) {
        query += `?projectId=${selectedProjectFilter}`;
      }
      const eventsRes = await api.get(`/calendar${query}`);
      console.log('Fetched raw events:', eventsRes.data);
      setEvents(eventsRes.data);

      // Fetch activities if a project is selected
      if (selectedProjectFilter) {
        const actsRes = await api.get(`/activities/project/${selectedProjectFilter}`);
        setActivities(actsRes.data);
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error('Failed to load calendar data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectFilter]);

  useEffect(() => {
    setSelectedProjectFilter(defaultProjectFilter);
  }, [defaultProjectFilter]);

  // Socket listener for real-time calendar refresh
  useEffect(() => {
    if (!socket) return;
    socket.on('calendar-refresh', fetchData);
    return () => {
      socket.off('calendar-refresh', fetchData);
    };
  }, [socket, selectedProjectFilter]);

  // Mini-calendar date click
  const handleMiniCalendarClick = (day) => {
    setCurrentDate(day);
    setView('day');
  };

  // Drag and Drop implementation
  const handleDragStart = (e, eventId) => {
    e.dataTransfer.setData('eventId', eventId);
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('eventId');
    if (!eventId) return;

    try {
      // Find event locally
      const originalEvent = events.find(ev => (ev._id || ev.id) === eventId);
      if (!originalEvent) return;

      const originalStart = new Date(originalEvent.start);
      const originalEnd = new Date(originalEvent.end);
      const diffMs = originalEnd.getTime() - originalStart.getTime();

      const newStart = new Date(targetDate);
      newStart.setHours(originalStart.getHours(), originalStart.getMinutes());
      const newEnd = new Date(newStart.getTime() + diffMs);

      // Optimistic local update
      setEvents(prev => prev.map(ev => {
        if ((ev._id || ev.id) === eventId) {
          return { ...ev, start: newStart, end: newEnd };
        }
        return ev;
      }));

      // Server update
      await api.put(`/calendar/${eventId}`, {
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      });

      fetchData();
    } catch (err) {
      console.error('Failed to update event date via drag-and-drop', err);
      alert(err.response?.data?.message || 'Failed to reschedule event.');
      fetchData();
    }
  };

  // Add Event Form Submission
  const handleAddEventSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/calendar', newEvent);
      setShowAddModal(false);
      setNewEvent({
        title: '',
        description: '',
        projectId: defaultProjectFilter,
        start: '',
        end: '',
        priority: 'Medium',
        category: 'Meeting',
        isRecurring: false,
        recurrenceRule: { frequency: 'Weekly', interval: 1, count: 5 },
        linkedActivities: [],
        reminderSettings: { timeBeforeMinutes: 15, type: 'in-app' }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create event.');
    }
  };

  // Add Holiday Form Submission
  const handleAddHolidaySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/calendar/holidays', newHoliday);
      setShowHolidayModal(false);
      setNewHoliday({ name: '', date: '', type: 'National' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add holiday.');
    }
  };

  // Add Comment Submission
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await api.post(`/calendar/${selectedEvent._id || selectedEvent.id}/comments`, { text: commentText });
      setSelectedEvent(res.data);
      setCommentText('');
      fetchData();
    } catch (err) {
      alert('Failed to post comment.');
    }
  };

  // Upload Attachment Submission
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!attachmentFile || !attachmentName.trim()) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileBase64 = reader.result;
        const res = await api.post(`/calendar/${selectedEvent._id || selectedEvent.id}/attachments`, {
          name: attachmentName,
          fileData: fileBase64,
          mimeType: attachmentFile.type
        });
        setSelectedEvent(res.data);
        setAttachmentFile(null);
        setAttachmentName('');
        fetchData();
      } catch (err) {
        alert('Failed to upload file.');
      }
    };
    reader.readAsDataURL(attachmentFile);
  };

  // Delete Event
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/calendar/${eventId}`);
      setShowDetailsModal(false);
      setSelectedEvent(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  // Filter Events
  const filteredEvents = events.filter(ev => {
    if (!ev) return false;
    // 1. Search text query
    const matchSearch = (ev.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 2. Category checkbox filter
    const matchCategory = selectedCategories.includes(ev.category);

    // 3. Priority checkbox filter
    const matchPriority = selectedPriorities.includes(ev.priority || 'Medium');

    // 4. Status checkbox filter
    const matchStatus = selectedStatuses.includes(ev.status || 'Pending');

    // 5. Critical Path Only toggle
    const matchCritical = !criticalPathOnly || ev.category === 'Critical Activity' || (ev.title && ev.title.includes('[Critical]'));

    return matchSearch && matchCategory && matchPriority && matchStatus && matchCritical;
  });
  console.log('Filtered events for render:', filteredEvents);

  // Calculate Dates grid helper
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Previous month padding days
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDate - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month padding days
    const totalCells = 42; // standard 6 rows
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getDaysInWeek = (date) => {
    const day = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - day);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(startOfWeek);
      nextDay.setDate(startOfWeek.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  const isToday = (someDate) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
      someDate.getMonth() === today.getMonth() &&
      someDate.getFullYear() === today.getFullYear();
  };

  // Main navigation handles
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(currentDate.getMonth() - 1);
    else if (view === 'week') newDate.setDate(currentDate.getDate() - 7);
    else newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(currentDate.getMonth() + 1);
    else if (view === 'week') newDate.setDate(currentDate.getDate() + 7);
    else newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const formattedMonthYear = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const formattedDay = currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Sidebar widget items
  const upcomingMilestones = filteredEvents.filter(ev => ev.category === 'Milestone' && new Date(ev.start) >= new Date()).slice(0, 4);
  const overdueTasks = filteredEvents.filter(ev => ev.status === 'Overdue' || (new Date(ev.end) < new Date() && ev.status !== 'Completed')).slice(0, 4);

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#F7F9FC]">
      
      {/* 1. LEFT SIDEBAR PANEL */}
      <aside className="w-full md:w-80 bg-white border-r border-[#D6DEE8] flex flex-col flex-shrink-0 overflow-y-auto p-5 space-y-6">
        
        {/* Quick Add and Admin Settings */}
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 py-2 px-3 bg-[#12355B] hover:bg-[#0E2A47] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add Event
          </button>
          
          {(user.role === 'ADMIN' || user.role === 'PROJECT_MANAGER') && (
            <button 
              onClick={() => setShowHolidayModal(true)}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-[#D6DEE8] rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5"
              title="Add System Holiday"
            >
              <Settings size={14} /> Holidays
            </button>
          )}
        </div>

        {/* Project Selector filter */}
        {!isWorkspaceMode && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Select Project</label>
            <select 
              value={selectedProjectFilter} 
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.projectName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search filter */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search events, comments..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-xl text-xs focus:outline-none"
          />
        </div>

        {/* Mini Calendar View widget */}
        <div className="bg-[#F7F9FC] border border-[#D6DEE8] rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-[#12355B] uppercase tracking-widest mb-3 flex items-center gap-1">
            <Calendar size={12} /> Navigator
          </h4>
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-500 mb-2">
            <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((dayObj, idx) => {
              const active = currentDate.getDate() === dayObj.date.getDate() && currentDate.getMonth() === dayObj.date.getMonth();
              return (
                <button
                  key={idx}
                  onClick={() => handleMiniCalendarClick(dayObj.date)}
                  className={`h-6 w-6 rounded-full flex items-center justify-center font-bold transition-all text-[9px] ${
                    active ? 'bg-[#2F6690] text-white' : 
                    isToday(dayObj.date) ? 'bg-sky-100 text-[#2F6690]' : 
                    dayObj.isCurrentMonth ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-350 hover:bg-slate-100'
                  }`}
                >
                  {dayObj.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filters */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Filter size={12} /> Category Filter
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(CATEGORY_ICONS).map((catName) => {
              const checked = selectedCategories.includes(catName);
              const styleColor = CATEGORY_STYLES[catName]?.color || '#475569';
              return (
                <label key={catName} className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-650">
                  <input 
                    type="checkbox" 
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        setSelectedCategories(prev => prev.filter(c => c !== catName));
                      } else {
                        setSelectedCategories(prev => [...prev, catName]);
                      }
                    }}
                    className="rounded text-[#2F6690] focus:ring-0"
                  />
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: styleColor }} />
                  <span className="truncate">{catName}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Critical Path Toggle */}
        <div className="border-t border-[#D6DEE8] pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={criticalPathOnly}
              onChange={() => setCriticalPathOnly(!criticalPathOnly)}
              className="rounded text-red-600 focus:ring-0"
            />
            <span className="text-[10px] font-extrabold text-[#C62828] uppercase tracking-wider">Critical Path Only</span>
          </label>
        </div>

        {/* Upcoming Milestones widget */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-[#D97706] uppercase tracking-widest flex items-center gap-1.5">
            <Flag size={12} /> Key Milestones
          </h4>
          {upcomingMilestones.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic">No upcoming milestones</p>
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.map((ms, idx) => (
                <div key={idx} className="bg-slate-50 border border-l-4 border-l-[#D97706] border-[#D6DEE8] p-2.5 rounded-lg flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold text-slate-800 truncate max-w-[120px]">{ms.title}</span>
                    <span className="text-[8px] font-black text-slate-400">{new Date(ms.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 line-clamp-1">{ms.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </aside>

      {/* 2. MAIN CALENDAR AREA */}
      <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        
        {/* Navigation and View Header controls */}
        <header className="h-16 border-b border-[#D6DEE8] px-6 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all">
                <ChevronLeft size={16} />
              </button>
              <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
            
            <h3 className="text-sm font-black text-[#12355B] uppercase tracking-wider font-outfit">
              {view === 'month' ? formattedMonthYear : view === 'week' ? `Week of ${formattedMonthYear}` : formattedDay}
            </h3>
            
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="py-1 px-3 border border-[#D6DEE8] hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-700 transition-all"
            >
              Today
            </button>
          </div>

          {/* View switches */}
          <div className="flex border border-[#D6DEE8] rounded-xl p-0.5 bg-slate-50">
            {['month', 'week', 'day', 'agenda'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`py-1 px-3 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  view === v ? 'bg-white text-[#12355B] shadow-sm' : 'text-slate-550 hover:text-[#2F6690]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </header>

        {/* Dynamic calendar workspace depending on view */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#F7F9FC]">
          
          {/* A. MONTHLY VIEW */}
          {view === 'month' && (
            <div className="h-full min-w-[700px] border border-[#D6DEE8] rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-[#D6DEE8] bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center py-2">
                <div className="text-red-500/80">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-slate-400">Sat</div>
              </div>
              
              {/* Month cells */}
              <div className="grid grid-cols-7 flex-1">
                {getDaysInMonth(currentDate).map((dayObj, cellIdx) => {
                  const cellDateStr = formatDateLocal(dayObj.date);
                  
                  // Filter events falling on this day
                  const dayEvents = filteredEvents.filter(ev => {
                    if (!ev || !ev.start) return false;
                    const startStr = formatDateLocal(ev.start);
                    const endStr = formatDateLocal(ev.end || ev.start);
                    return startStr && endStr && cellDateStr >= startStr && cellDateStr <= endStr;
                  });

                  const hasHoliday = dayEvents.some(ev => ev.isHoliday);
                  const isWeekend = dayObj.date.getDay() === 0 || dayObj.date.getDay() === 6;

                  return (
                    <div
                      key={cellIdx}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, dayObj.date)}
                      className={`min-h-[90px] border-b border-r border-[#E2E8F0] last:border-b-0 p-1.5 flex flex-col justify-between transition-colors ${
                        hasHoliday ? 'bg-teal-50/20' :
                        !dayObj.isCurrentMonth ? 'bg-slate-50/50 text-slate-450' :
                        isWeekend ? 'bg-slate-50/40 text-slate-600' :
                        'bg-white'
                      } ${isToday(dayObj.date) ? 'ring-2 ring-inset ring-[#2F6690]/35 bg-sky-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          isToday(dayObj.date) ? 'bg-[#2F6690] text-white' : 'text-slate-500'
                        }`}>
                          {dayObj.date.getDate()}
                        </span>
                        
                        {/* Quick Add inline trigger */}
                        <button
                          onClick={() => {
                            const dateStr = formatDateLocal(dayObj.date);
                            setNewEvent(prev => ({ ...prev, start: `${dateStr}T09:00`, end: `${dateStr}T10:00` }));
                            setShowAddModal(true);
                          }}
                          className="opacity-0 hover:opacity-100 text-slate-400 hover:text-[#12355B] p-0.5 transition-opacity"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      {/* Day events badges stack */}
                      <div className="flex-1 overflow-y-auto space-y-1 max-h-[70px]">
                        {dayEvents.map((ev, evIdx) => {
                          const IconComp = CATEGORY_ICONS[ev.category] || Anchor;
                          return (
                            <div
                              key={evIdx}
                              draggable={!ev.isSystem}
                              onDragStart={(e) => handleDragStart(e, ev._id || ev.id)}
                              onClick={() => {
                                setSelectedEvent(ev);
                                setShowDetailsModal(true);
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold truncate flex items-center gap-1 border cursor-pointer hover:scale-[1.02] transition-transform ${
                                ev.isHoliday ? 'bg-teal-50 border-teal-200 text-teal-700' :
                                ev.category === 'Milestone' ? 'bg-[#D97706]/10 border-[#D97706]/35 text-[#D97706]' :
                                ev.priority === 'Critical' ? 'bg-red-50 border-red-200 text-red-700' : 
                                'bg-[#F1F5F9] border-slate-200 text-slate-700'
                              }`}
                              title={ev.title}
                              style={!ev.isHoliday && ev.category !== 'Milestone' && ev.priority !== 'Critical' ? { 
                                borderLeft: `3px solid ${ev.color || '#2F6690'}` 
                              } : {}}
                            >
                              <IconComp size={8} className="flex-shrink-0" />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. WEEKLY VIEW */}
          {view === 'week' && (
            <div className="grid grid-cols-7 gap-4 min-w-[700px]">
              {getDaysInWeek(currentDate).map((day, idx) => {
                const dayDateStr = formatDateLocal(day);
                const dayEvents = filteredEvents.filter(ev => {
                  if (!ev || !ev.start) return false;
                  const startStr = formatDateLocal(ev.start);
                  const endStr = formatDateLocal(ev.end || ev.start);
                  return startStr && endStr && dayDateStr >= startStr && dayDateStr <= endStr;
                });

                return (
                  <div 
                    key={idx} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`bg-white border border-[#D6DEE8] rounded-2xl p-4 min-h-[450px] shadow-sm flex flex-col ${
                      isToday(day) ? 'ring-2 ring-[#2F6690]' : ''
                    }`}
                  >
                    <div className="border-b border-[#D6DEE8] pb-2 mb-4 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                      <p className={`text-base font-extrabold mt-1 h-8 w-8 inline-flex items-center justify-center rounded-full ${
                        isToday(day) ? 'bg-[#2F6690] text-white' : 'text-slate-800'
                      }`}>{day.getDate()}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                      {dayEvents.map((ev) => {
                        const IconComp = CATEGORY_ICONS[ev.category] || Anchor;
                        return (
                          <div
                            key={ev._id || ev.id}
                            draggable={!ev.isSystem}
                            onDragStart={(e) => handleDragStart(e, ev._id || ev.id)}
                            onClick={() => {
                              setSelectedEvent(ev);
                              setShowDetailsModal(true);
                            }}
                            className="bg-slate-50 border border-slate-200 hover:border-[#2F6690] rounded-xl p-2.5 text-[9px] font-bold text-slate-800 cursor-pointer shadow-sm hover:scale-[1.01] transition-transform space-y-1.5"
                            style={{ borderLeft: `4px solid ${ev.color || '#2F6690'}` }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[8px] text-slate-450 uppercase">{ev.category}</span>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                ev.priority === 'Critical' ? 'bg-red-500' :
                                ev.priority === 'High' ? 'bg-orange-500' :
                                ev.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                            </div>
                            <h5 className="font-bold text-[10px] text-slate-800 truncate flex items-center gap-1">
                              <IconComp size={10} className="text-slate-500" />
                              {ev.title}
                            </h5>
                            <p className="text-[8px] text-slate-400 truncate leading-none">{ev.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* C. DAILY VIEW */}
          {view === 'day' && (
            <div className="bg-white border border-[#D6DEE8] rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="flex justify-between items-center border-b border-[#D6DEE8] pb-3">
                <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} /> Agenda Schedule
                </h4>
                <button
                  onClick={() => {
                    const dateStr = formatDateLocal(currentDate);
                    setNewEvent(prev => ({ ...prev, start: `${dateStr}T09:00`, end: `${dateStr}T10:00` }));
                    setShowAddModal(true);
                  }}
                  className="py-1 px-3 bg-[#2F6690] text-white rounded-lg text-[10px] font-bold hover:bg-[#3A7CA5] transition-all flex items-center gap-1"
                >
                  <Plus size={12} /> Add Event
                </button>
              </div>

              {/* Day filter result */}
              {(() => {
                const dayDateStr = formatDateLocal(currentDate);
                const dayEvents = filteredEvents.filter(ev => {
                  if (!ev || !ev.start) return false;
                  const startStr = formatDateLocal(ev.start);
                  const endStr = formatDateLocal(ev.end || ev.start);
                  return startStr && endStr && dayDateStr >= startStr && dayDateStr <= endStr;
                });

                if (dayEvents.length === 0) {
                  return <p className="text-center text-slate-400 italic text-[11px] py-12">No events scheduled for this day.</p>;
                }

                return (
                  <div className="divide-y divide-slate-100">
                    {dayEvents.map((ev) => {
                      const IconComp = CATEGORY_ICONS[ev.category] || Anchor;
                      return (
                        <div 
                          key={ev._id || ev.id}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setShowDetailsModal(true);
                          }}
                          className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-xl px-2.5 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span 
                              className="h-9 w-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
                              style={{ backgroundColor: ev.color || '#2F6690' }}
                            >
                              <IconComp size={15} />
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{ev.title}</p>
                              <p className="text-[9px] text-slate-450 mt-0.5">{ev.description || 'No description provided.'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-extrabold text-slate-500">
                              {new Date(ev.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                              ev.priority === 'Critical' ? 'bg-red-50 border-red-200 text-red-700' :
                              ev.priority === 'High' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                              'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>{ev.priority}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* D. AGENDA / LIST VIEW */}
          {view === 'agenda' && (
            <div className="bg-white border border-[#D6DEE8] rounded-2xl p-6 shadow-sm max-w-4xl mx-auto space-y-4">
              <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider pb-2 border-b border-[#D6DEE8]">Timeline Agenda List</h4>
              
              {filteredEvents.length === 0 ? (
                <p className="text-center text-slate-400 italic text-[11px] py-12">No upcoming calendar events matching filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#D6DEE8] text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Event Title</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Linked Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvents.sort((a,b) => new Date(a.start) - new Date(b.start)).map((ev) => {
                        const dateObj = new Date(ev.start);
                        return (
                          <tr 
                            key={ev._id || ev.id}
                            onClick={() => {
                              setSelectedEvent(ev);
                              setShowDetailsModal(true);
                            }}
                            className="hover:bg-slate-50/70 cursor-pointer text-slate-700 font-medium"
                          >
                            <td className="py-3 px-3 font-bold">{dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="py-3 px-3 text-slate-450">{dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="py-3 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider" style={{ borderColor: ev.color, color: ev.color }}>
                                {ev.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-[#12355B]">{ev.title}</td>
                            <td className="py-3 px-3">
                              <span className={`text-[8px] font-black uppercase tracking-wider ${
                                ev.priority === 'Critical' ? 'text-red-600' :
                                ev.priority === 'High' ? 'text-orange-500' : 'text-slate-500'
                              }`}>{ev.priority}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-[10px]">
                              {ev.projectId ? 'Project Linked' : 'Global / Personal'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* 3. MODALS BLOCK */}

      {/* A. QUICK ADD EVENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#D6DEE8] rounded-2xl w-full max-w-md shadow-2xl p-6 relative flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-650"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-black text-[#12355B] uppercase tracking-wider font-outfit">Create New Event</h3>
            
            <form onSubmit={handleAddEventSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Event Title</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Design review checklist review"
                  className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-xl text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select 
                    value={newEvent.category}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                  >
                    {Object.keys(CATEGORY_ICONS).filter(k => k !== 'Holiday' && k !== 'Activity' && k !== 'Critical Activity').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                  <select 
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, priority: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.start}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, start: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.end}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea 
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Details of scheduling, milestones, meeting links..."
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-xl text-slate-900 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Project Link</label>
                  <select 
                    value={newEvent.projectId}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, projectId: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                  >
                    <option value="">No Project Link</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.projectName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Reminder settings</label>
                  <select 
                    value={newEvent.reminderSettings.timeBeforeMinutes}
                    onChange={(e) => setNewEvent(prev => ({ 
                      ...prev, 
                      reminderSettings: { ...prev.reminderSettings, timeBeforeMinutes: parseInt(e.target.value) } 
                    }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white rounded-xl text-xs font-bold transition-all shadow-md mt-2"
              >
                Create Event Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* B. EVENT DETAILS MODAL (COMMENTS & ATTACHMENTS SUPPORTED) */}
      {showDetailsModal && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#D6DEE8] rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedEvent(null);
              }}
              className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-650"
            >
              <X size={16} />
            </button>

            {/* Left Column: Event details */}
            <div className="flex-1 space-y-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider" style={{ borderColor: selectedEvent.color, color: selectedEvent.color }}>
                  {selectedEvent.category}
                </span>
                <h3 className="text-base font-black text-[#12355B] mt-1.5 uppercase font-outfit leading-tight">{selectedEvent.title}</h3>
              </div>

              <div className="bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl p-3.5 space-y-2 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-slate-450" />
                  <span>
                    <strong>Start:</strong> {new Date(selectedEvent.start).toLocaleString('en-GB')}
                  </span>
                </div>
                {selectedEvent.end && (
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-slate-450" />
                    <span>
                      <strong>End:</strong> {new Date(selectedEvent.end).toLocaleString('en-GB')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Info size={13} className="text-slate-450" />
                  <span>
                    <strong>Priority:</strong> <span className="font-extrabold uppercase text-[10px]" style={{ color: selectedEvent.priority === 'Critical' ? '#C62828' : '#475569' }}>{selectedEvent.priority || 'Medium'}</span>
                  </span>
                </div>
                {selectedEvent.ownerId && (
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-slate-450" />
                    <span>
                      <strong>Scheduler:</strong> {selectedEvent.ownerId.name || 'System Generated'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details & Description</h5>
                <p className="text-xs text-slate-650 font-medium leading-relaxed mt-1">{selectedEvent.description || 'No detailed description available.'}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                {selectedEvent.projectId && (
                  <button 
                    onClick={() => {
                      onSelectProject(selectedEvent.projectId);
                    }}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-[#D6DEE8] text-[#12355B] rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                  >
                    <Anchor size={12} /> Go to Project Workspace
                  </button>
                )}
                {!selectedEvent.isSystem && (
                  <button 
                    onClick={() => handleDeleteEvent(selectedEvent._id || selectedEvent.id)}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-750 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ml-auto"
                  >
                    <Trash2 size={12} /> Delete Event
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Dynamic collaboration section (Only for manual events in db) */}
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-[#D6DEE8] pt-4 md:pt-0 md:pl-6 flex flex-col justify-between max-h-[350px] md:max-h-[400px]">
              {selectedEvent.isSystem ? (
                <div className="h-full flex items-center justify-center p-6 text-center text-slate-400 italic text-[10px] bg-slate-50 rounded-xl">
                  Collaborative comments, documents upload, and feedback are available on manual meeting and reminder events.
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between gap-4">
                  
                  {/* Comments thread */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      Comments ({selectedEvent.comments?.length || 0})
                    </h5>
                    {(selectedEvent.comments || []).length === 0 ? (
                      <p className="text-[9px] text-slate-400 italic">No feedback posted yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedEvent.comments.map((c, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-150 p-2 rounded-xl text-[9px] font-medium text-slate-700">
                            <div className="flex justify-between">
                              <span className="font-extrabold text-slate-800">{c.userName}</span>
                              <span className="text-[7px] text-slate-400">{new Date(c.timestamp).toLocaleDateString('en-GB')}</span>
                            </div>
                            <p className="mt-1 text-slate-600 leading-snug">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comment box */}
                  <form onSubmit={handleAddComment} className="flex gap-1">
                    <input 
                      type="text" 
                      placeholder="Post a comment..." 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-[10px] focus:outline-none"
                    />
                    <button type="submit" className="p-1.5 bg-[#2F6690] text-white rounded-xl hover:bg-[#3A7CA5] transition-all">
                      <Send size={12} />
                    </button>
                  </form>

                  {/* Attachments Section */}
                  <div className="border-t border-[#D6DEE8] pt-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Paperclip size={10} /> Attachments ({selectedEvent.attachments?.length || 0})
                    </h5>
                    
                    <div className="space-y-1.5 max-h-[80px] overflow-y-auto">
                      {(selectedEvent.attachments || []).map((file, idx) => (
                        <a 
                          key={idx}
                          href={file.fileData} 
                          download={file.name}
                          className="flex items-center gap-1 text-[9px] font-bold text-[#2F6690] hover:underline truncate"
                        >
                          <Paperclip size={8} /> {file.name}
                        </a>
                      ))}
                    </div>

                    <form onSubmit={handleUploadAttachment} className="flex flex-col gap-2 mt-2">
                      <input 
                        type="text" 
                        placeholder="Document label..."
                        value={attachmentName}
                        onChange={(e) => setAttachmentName(e.target.value)}
                        className="px-3 py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-[9px] focus:outline-none"
                      />
                      <div className="flex gap-1">
                        <input 
                          type="file" 
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              setAttachmentFile(e.target.files[0]);
                              if (!attachmentName) setAttachmentName(e.target.files[0].name);
                            }
                          }}
                          className="flex-1 text-[8px] file:py-1 file:px-2 file:border-0 file:rounded-lg file:bg-slate-100 file:text-[8px] file:font-bold hover:file:bg-slate-200 cursor-pointer"
                        />
                        <button type="submit" className="px-2.5 py-1 bg-[#2D6A4F] text-white rounded-lg text-[8px] font-bold hover:bg-[#3C8561] transition-all">
                          Upload
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* C. HOLIDAYS CREATION MODAL */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#D6DEE8] rounded-2xl w-full max-w-sm shadow-2xl p-6 relative flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowHolidayModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-650"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-black text-[#12355B] uppercase tracking-wider font-outfit">Add System Holiday</h3>
            
            <form onSubmit={handleAddHolidaySubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Holiday Title</label>
                <input 
                  type="text" 
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Independence Day"
                  className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                  <select 
                    value={newHoliday.type}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, type: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl text-slate-800 focus:outline-none"
                  >
                    <option value="National">National Holiday</option>
                    <option value="Company">Company Leave</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white rounded-xl text-xs font-bold transition-all shadow-md mt-2"
              >
                Save System Holiday
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default CalendarPage;
