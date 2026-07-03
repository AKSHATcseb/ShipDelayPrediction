import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useSocket } from './context/SocketContext.jsx';
import api from './utils/api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectWorkspace from './pages/ProjectWorkspace.jsx';
import UsersPage from './pages/UsersPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReviewsPage from './pages/ReviewsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';

import { 
  LogOut, LayoutGrid, Bell, Menu, Users, ClipboardList, 
  ChevronLeft, ChevronRight, Anchor, ShieldAlert, FileText, MessageSquare, FolderOpen, X
} from 'lucide-react';
import NotificationCenter from './components/NotificationCenter.jsx';

function App() {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const socket = useSocket();
  
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'workspace', 'users', 'templates'
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated]);

  // Real-time socket listener for notifications
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      
      // Trigger toast alert
      const toastId = Date.now();
      setToasts((prev) => [...prev, { id: toastId, ...notif }]);
      
      // Auto-remove toast after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 4000);
    };

    socket.on('notification-received', handleNotification);

    return () => {
      socket.off('notification-received', handleNotification);
    };
  }, [socket, isAuthenticated]);

  const unreadCount = notifications.filter(n => !n.isRead).length;


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-4">Loading Navy PMIS Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const navigateToProject = (projectId) => {
    setActiveProjectId(projectId);
    setCurrentPage('workspace');
  };

  const navigateToDashboard = () => {
    setActiveProjectId(null);
    setCurrentPage('dashboard');
  };

  const handleSidebarNav = (page) => {
    setActiveProjectId(null);
    setCurrentPage(page);
  };

  // Resolve role colors
  const roleColors = {
    PROJECT_MANAGER: 'text-[#D97706] bg-[#D97706]/10 border-[#D97706]/20',
    VIEWER: 'text-[#2F6690] bg-[#2F6690]/10 border-[#2F6690]/20'
  };

  const roleText = {
    PROJECT_MANAGER: 'Project Manager',
    VIEWER: 'Observer / Viewer'
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#1F2937] flex overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside 
        className={`bg-[#12355B] flex flex-col justify-between transition-all duration-300 relative z-20 flex-shrink-0 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden" onClick={navigateToDashboard}>
              <span className="h-8 w-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white flex-shrink-0 cursor-pointer">
                <Anchor size={16} />
              </span>
              {!sidebarCollapsed && (
                <div className="cursor-pointer">
                  <span className="font-extrabold text-sm tracking-wider font-outfit text-white block">NAVY PMIS</span>
                  <span className="text-[8px] font-black text-sky-300 tracking-widest uppercase block -mt-0.5">Enterprise</span>
                </div>
              )}
            </div>
            
            {/* Collapse toggle button inside sidebar */}
            {!sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(true)}
                className="text-white/60 hover:text-white p-1 hover:bg-white/10 border border-transparent rounded transition-all hidden md:block"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>

          {/* Navigation Links list */}
          <nav className="p-3 space-y-1.5">
            {/* Dashboard / Workspaces */}
            <button 
              onClick={() => handleSidebarNav('dashboard')}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-3 ${
                currentPage === 'dashboard' 
                  ? 'bg-[#2F6690] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/5'
              }`}
            >
              <LayoutGrid size={15} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            {/* Templates (PROJECT_MANAGER only) */}
            {user.role === 'PROJECT_MANAGER' && (
              <button 
                onClick={() => handleSidebarNav('templates')}
                className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-3 ${
                  currentPage === 'templates' 
                    ? 'bg-[#2F6690] text-white shadow-sm' 
                    : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                <ClipboardList size={15} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>Acquisition Templates</span>}
              </button>
            )}

            {/* Projects */}
            <button 
              onClick={() => handleSidebarNav('projects')}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-3 ${
                currentPage === 'projects' || currentPage === 'workspace' 
                  ? 'bg-[#2F6690] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/5'
              }`}
            >
              <Anchor size={15} className={`flex-shrink-0 ${currentPage === 'projects' || currentPage === 'workspace' ? 'text-white' : 'text-slate-400'}`} />
              {!sidebarCollapsed && <span>Projects</span>}
            </button>

            {/* Documents */}
            <button 
              onClick={() => handleSidebarNav('documents')}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-3 ${
                currentPage === 'documents' 
                  ? 'bg-[#2F6690] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/5'
              }`}
            >
              <FolderOpen size={15} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Documents</span>}
            </button>

            {/* Reports */}
            <button 
              onClick={() => handleSidebarNav('reports')}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-3 ${
                currentPage === 'reports' 
                  ? 'bg-[#2F6690] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/5'
              }`}
            >
              <FileText size={15} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Reports</span>}
            </button>

            {/* Comments & Reviews / Reviews & Suggestions */}
            <button 
              onClick={() => handleSidebarNav('reviews')}
              className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-3 ${
                currentPage === 'reviews' 
                  ? 'bg-[#2F6690] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/5'
              }`}
            >
              <MessageSquare size={15} className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <span>
                  {user.role === 'PROJECT_MANAGER' ? 'Comments & Reviews' : 'Reviews & Suggestions'}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: User details and logout */}
        <div className="border-t border-white/10 p-3 space-y-3 bg-[#0d2744]">
          {!sidebarCollapsed ? (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <div>
                <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                <p className="text-[9px] text-slate-400 font-semibold truncate mt-1">{user.email}</p>
              </div>
              <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${roleColors[user.role]}`}>
                {roleText[user.role]}
              </span>
            </div>
          ) : (
            <div className="flex justify-center" title={`${user.name} (${roleText[user.role]})`}>
              <span className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white border border-white/20">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <button 
            onClick={logout}
            className={`w-full px-3.5 py-2 bg-white/5 hover:bg-[#C62828]/10 border border-white/15 hover:border-[#C62828]/20 text-slate-300 hover:text-[#C62828] rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold`}
            title="Log Out"
          >
            <LogOut size={13} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#F7F9FC]">
        
        {/* Top Header bar */}
        <header className="h-14 border-b border-[#D6DEE8] bg-white flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            {/* Sidebar toggle button (visible when collapsed) */}
            {sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(false)}
                className="text-slate-500 hover:text-[#12355B] p-1.5 hover:bg-slate-100 border border-slate-200 rounded transition-all"
              >
                <ChevronRight size={14} />
              </button>
            )}
            
            {/* Page Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold cursor-pointer hover:text-[#12355B]" onClick={navigateToDashboard}>Navy PMIS</span>
              <span className="text-slate-300 font-extrabold">/</span>
              <span className="text-[#12355B] font-extrabold uppercase tracking-wider text-[10px]">
                {currentPage === 'dashboard' ? 'Dashboard' : 
                 currentPage === 'projects' ? 'Projects' : 
                 currentPage === 'workspace' ? 'Workspace' : 
                 currentPage === 'documents' ? 'Documents' : 
                 currentPage === 'reports' ? 'Reports' : 
                 currentPage === 'reviews' ? 'Reviews' : 
                 'Templates'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications toggle */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-[#12355B] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg relative transition-all"
                title="Notifications Center"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#C62828] text-white text-[8px] font-black flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationCenter 
                  notifications={notifications}
                  setNotifications={setNotifications}
                  onClose={() => setShowNotifications(false)} 
                />
              )}
            </div>
            
            <div className="h-6 w-[1px] bg-slate-200"></div>

            {/* Sandbox details */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#E8EFF5] border border-[#D6DEE8] rounded-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2D6A4F] animate-pulse"></span>
              <span className="text-[9px] font-black text-[#12355B] uppercase tracking-widest">Operational Gateway</span>
            </div>
          </div>
        </header>

        {/* Main Pages Switch */}
        <main className="flex-1 flex flex-col min-h-0 bg-slate-950">
          {currentPage === 'dashboard' && (
            <Dashboard 
              onSelectProject={navigateToProject} 
              onNavigate={handleSidebarNav}
            />
          )}
          {currentPage === 'projects' && (
            <ProjectsPage 
              onSelectProject={navigateToProject} 
            />
          )}
          {currentPage === 'workspace' && (
            <ProjectWorkspace 
              projectId={activeProjectId} 
              onBack={navigateToDashboard} 
            />
          )}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'reviews' && <ReviewsPage />}
          {currentPage === 'templates' && user.role === 'PROJECT_MANAGER' && <TemplatesPage />}
        </main>
      </div>
      
      {/* Toast notifications container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className="pointer-events-auto bg-[#12355B] text-white border border-white/10 rounded-xl shadow-2xl p-4 flex gap-3 animate-in slide-in-from-bottom-5 slide-in-from-right-5 duration-300 relative overflow-hidden"
          >
            {/* Left accent strip depending on type */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              t.type === 'mention' ? 'bg-[#2F6690]' :
              t.type === 'assigned' ? 'bg-[#D97706]' :
              t.type === 'activity_ready' ? 'bg-[#2D6A4F]' :
              'bg-[#C62828]'
            }`} />
            
            <div className="flex-1 pl-1">
              <span className="text-[9px] font-black text-sky-300 uppercase tracking-wider block">
                {t.type === 'mention' ? '@ Mention' :
                 t.type === 'assigned' ? 'Task Assigned' :
                 t.type === 'activity_ready' ? 'Task Unlocked' :
                 'Risk Update'}
              </span>
              <p className="text-[11px] font-bold mt-1 text-slate-100 leading-snug">
                {t.content}
              </p>
            </div>
            <button 
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-white/60 hover:text-white self-start"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
