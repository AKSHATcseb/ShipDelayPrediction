import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  FolderKanban, Plus, Clock, ShieldAlert, DollarSign, 
  AlertTriangle, CheckCircle2, ChevronRight, Calendar,
  ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';

function Dashboard({ onSelectProject, onNavigate }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form Fields
  const [projectName, setProjectName] = useState('');
  const [projectIdCode, setProjectIdCode] = useState('');
  const [shipName, setShipName] = useState('');
  const [shipClass, setShipClass] = useState('');
  const [shipType, setShipType] = useState('Submarine');
  const [projectCost, setProjectCost] = useState('');
  const [customer, setCustomer] = useState('Indian Navy');
  const [startDate, setStartDate] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [priority, setPriority] = useState('Medium');

  // PM specific metrics
  const [myTasks, setMyTasks] = useState([]);

  const fetchData = async () => {
    try {
      // 1. Fetch Projects
      const projectsRes = await api.get('/auth/projects');
      const allProjects = projectsRes.data;
      setProjects(allProjects);

      // 2. Fetch Templates (if PM)
      if (user.role === 'PROJECT_MANAGER') {
        const templatesRes = await api.get('/templates');
        setTemplates(templatesRes.data);
        if (templatesRes.data.length > 0) {
          setTemplateId(templatesRes.data[0]._id || templatesRes.data[0].id);
        }
      }

      // 3. Fetch pending/delayed tasks across PM projects
      if (user.role === 'PROJECT_MANAGER') {
        const pendingTasks = [];
        for (const p of allProjects) {
          try {
            const actsRes = await api.get(`/activities/project/${p._id}`);
            const acts = actsRes.data;
            // Get InProgress or Delayed tasks
            const filtered = acts.filter(a => ['InProgress', 'Delayed', 'Blocked'].includes(a.currentStatus));
            filtered.forEach(act => {
              pendingTasks.push({
                ...act,
                projectName: p.projectName,
                projectIdCode: p.projectIdCode
              });
            });
          } catch (e) {
            console.error(`Failed to fetch activities for project ${p._id}`, e);
          }
        }
        // Sort tasks by sequence/urgency and limit
        setMyTasks(pendingTasks.slice(0, 5));
      }

    } catch (err) {
      console.error('Error fetching dashboard analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/projects', {
        projectName,
        projectIdCode,
        shipName,
        shipClass,
        shipType,
        projectCost: parseFloat(projectCost),
        customer,
        startDate,
        templateId,
        priority
      });
      
      setProjects([...projects, res.data]);
      setSuccess('Project workspace created successfully!');
      setShowModal(false);
      
      // Reset form
      setProjectName('');
      setProjectIdCode('');
      setShipName('');
      setShipClass('');
      setStartDate('');
      if (templates.length > 0) setTemplateId(templates[0]._id || templates[0].id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#F7F9FC]">
        <div className="h-8 w-8 border-4 border-[#12355B] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-4">Loading Dashboard Analytics...</p>
      </div>
    );
  }

  // Dashboard Stats Calculations
  const totalProjects = projects.length;
  const averageDelay = projects.reduce((acc, p) => acc + (p.predictedDelayMonths || 0), 0) / (totalProjects || 1);
  const totalCost = projects.reduce((acc, p) => acc + (p.projectCost || 0), 0);
  const criticalRiskProjects = projects.filter(p => ['High', 'Critical'].includes(p.predictedRiskCategory)).length;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto bg-[#F7F9FC] flex flex-col min-h-0 engineering-grid">
      
      {/* Toast Alert */}
      {success && (
        <div className="p-4 bg-[#2D6A4F]/10 border border-[#2D6A4F]/25 text-[#2D6A4F] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="stroke-[2.5]" />
          {success}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6DEE8] pb-5 flex-shrink-0">
        <div>
          <h1 className="text-xl font-black text-[#12355B] tracking-wide font-outfit uppercase">
            {user.role === 'PROJECT_MANAGER' ? 'Project Manager Command Center' : 
             'Acquisition Steering Board Dashboard'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {user.role === 'PROJECT_MANAGER' ? 'Oversee ship acquisition programs and project activities.' :
             'Read-only strategic oversight, milestones, and delay predictions.'}
          </p>
        </div>
        {user.role === 'PROJECT_MANAGER' && (
          <button 
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md shadow-navy-900/10 animate-in fade-in duration-200"
          >
            <Plus size={14} className="stroke-[2.5]" />
            Create Program
          </button>
        )}
      </div>

      {/* RENDER PM DASHBOARD */}
      {user.role === 'PROJECT_MANAGER' && (
        <div className="space-y-8">
          {/* PM Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#12355B]/10 border border-[#12355B]/20 flex items-center justify-center text-[#12355B]">
                <FolderKanban size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">My Programs</p>
                <p className="text-xl font-black text-[#12355B] mt-0.5">{totalProjects}</p>
              </div>
            </div>

            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#C62828]/10 border border-[#C62828]/20 flex items-center justify-center text-[#C62828]">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg predicted Delay</p>
                <p className="text-xl font-black text-[#C62828] mt-0.5">+{averageDelay.toFixed(1)} Months</p>
              </div>
            </div>

            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center text-[#D97706]">
                <ShieldAlert size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High Risk Programs</p>
                <p className="text-xl font-black text-[#D97706] mt-0.5">{criticalRiskProjects}</p>
              </div>
            </div>

            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 flex items-center justify-center text-[#2D6A4F]">
                <DollarSign size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Budget</p>
                <p className="text-xl font-black text-[#2D6A4F] mt-0.5">₹{totalCost.toFixed(0)} Cr</p>
              </div>
            </div>
          </div>

          {/* Delayed/InProgress Activities Table */}
          <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-black text-[#12355B] uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#D97706] stroke-[2.5]" />
              Critical Tasks & Delayed Activities (My Programs)
            </h3>
            {myTasks.length === 0 ? (
              <p className="text-xs text-slate-450 italic py-6 text-center">No active tasks are currently delayed or blocked.</p>
            ) : (
              <div className="overflow-x-auto border border-[#D6DEE8] rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead>
                    <tr className="bg-[#F7F9FC] border-b border-[#D6DEE8] text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="p-3">Program</th>
                      <th className="p-3">Activity description</th>
                      <th className="p-3">Gantt Stage</th>
                      <th className="p-3">Current Status</th>
                      <th className="p-3 text-right">Activity Delay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6DEE8]">
                    {myTasks.map((task) => (
                      <tr key={task._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-[#12355B]">{task.projectIdCode}</td>
                        <td className="p-3 font-medium text-slate-900">{task.activityName}</td>
                        <td className="p-3 text-slate-500 font-semibold">{task.stageName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            task.currentStatus === 'Delayed' ? 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/25' : 
                            task.currentStatus === 'Blocked' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 
                            'bg-[#2F6690]/10 text-[#2F6690] border border-[#2F6690]/25'
                          }`}>
                            {task.currentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-[#C62828]">+{task.currentDelayDays} Days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEWER DASHBOARD */}
      {user.role === 'VIEWER' && (
        <div className="space-y-8">
          {/* Viewer Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#12355B]/10 border border-[#12355B]/20 flex items-center justify-center text-[#12355B]">
                <FolderKanban size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Accessible Programs</p>
                <p className="text-xl font-black text-[#12355B] mt-0.5">{totalProjects}</p>
              </div>
            </div>

            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#C62828]/10 border border-[#C62828]/20 flex items-center justify-center text-[#C62828]">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Global Predicted Delay</p>
                <p className="text-xl font-black text-[#C62828] mt-0.5">+{averageDelay.toFixed(1)} Months</p>
              </div>
            </div>

            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center text-[#D97706]">
                <ShieldAlert size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Risk Register Alerts</p>
                <p className="text-xl font-black text-[#D97706] mt-0.5">{criticalRiskProjects}</p>
              </div>
            </div>

            <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex items-center gap-4 card-lift shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 flex items-center justify-center text-[#2D6A4F]">
                <DollarSign size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Value</p>
                <p className="text-xl font-black text-[#2D6A4F] mt-0.5">₹{totalCost.toFixed(0)} Cr</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT WORKSPACES LIST (FOR ALL ROLES) */}
      <div className="space-y-4">
        <div className="border-b border-[#D6DEE8] pb-3">
          <h2 className="text-xs font-black text-[#12355B] uppercase tracking-widest">
            {user.role === 'PROJECT_MANAGER' ? 'My Project Workspaces' : 'Accessible Project Workspaces'}
          </h2>
        </div>

        {projects.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#D6DEE8] rounded-2xl bg-white shadow-sm">
            <FolderKanban className="mx-auto text-slate-400 mb-3" size={32} />
            <p className="text-xs font-bold text-slate-500">No active project workspaces found.</p>
            {user.role === 'PROJECT_MANAGER' && (
              <p className="text-[10px] text-slate-450 mt-1">Create a new workspace using templates to get started.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => {
              const riskColors = {
                Low: 'bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/20',
                Medium: 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20',
                High: 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/20',
                Critical: 'bg-purple-100 text-purple-850 border border-purple-200'
              };

              return (
                <div 
                  key={p._id}
                  onClick={() => onSelectProject(p._id)}
                  className="bg-white hover:bg-slate-50/50 border border-[#D6DEE8] hover:border-[#2F6690] p-6 rounded-2xl cursor-pointer transition-all duration-200 card-lift shadow-sm flex flex-col justify-between h-[190px]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] font-black text-[#12355B] bg-[#E8EFF5] px-2 py-0.5 rounded border border-[#D6DEE8] uppercase tracking-widest">{p.projectIdCode}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${riskColors[p.predictedRiskCategory || 'Low']}`}>
                        {p.predictedRiskCategory || 'Low'} Risk
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-[#12355B] mt-3 group-hover:text-[#2F6690] transition-colors font-outfit line-clamp-1">
                      {p.projectName}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                      Vessel: {p.shipName || 'TBD'} ({p.shipClass || 'General'})
                    </p>
                  </div>

                  <div className="border-t border-[#D6DEE8] mt-4 pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] text-slate-450 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Clock size={9} /> Delay Predicted
                      </p>
                      <p className="text-xs font-black text-[#C62828] mt-0.5">
                        +{p.predictedDelayMonths?.toFixed(1) || '0.0'} Months
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-450 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={9} /> Est Completion
                      </p>
                      <p className="text-xs font-black text-[#12355B] mt-0.5">
                        {p.expectedEndDate ? new Date(p.expectedEndDate).toLocaleDateString('en-GB') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6DEE8] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#D6DEE8] flex items-center justify-between bg-[#F7F9FC]">
              <h3 className="font-black text-[#12355B] text-sm font-outfit uppercase tracking-wider">Create Acquisition Program</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-[#12355B] text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 mx-6 mt-4 bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828] rounded-xl text-xs font-bold text-center flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span className="flex-1 text-left">{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selected Template Blueprint</label>
                  {templates.length === 0 ? (
                    <p className="text-xs text-[#C62828] font-semibold mt-1">No templates designed. Create templates in the Acquisition Templates tab first.</p>
                  ) : (
                    <select 
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                      required
                    >
                      {templates.map(t => (
                        <option key={t._id || t.id} value={t._id || t.id}>{t.name || t.templateName}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project Name</label>
                    <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. Project 17 Alpha"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project Code</label>
                    <input 
                      type="text" 
                      value={projectIdCode}
                      onChange={(e) => setProjectIdCode(e.target.value)}
                      placeholder="e.g. P17A"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ship Name</label>
                    <input 
                      type="text" 
                      value={shipName}
                      onChange={(e) => setShipName(e.target.value)}
                      placeholder="e.g. INS Nilgiri"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ship Class</label>
                    <input 
                      type="text" 
                      value={shipClass}
                      onChange={(e) => setShipClass(e.target.value)}
                      placeholder="e.g. Frigate"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ship Type</label>
                    <select 
                      value={shipType} 
                      onChange={(e) => setShipType(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    >
                      <option>Submarine</option>
                      <option>Destroyer</option>
                      <option>Frigate</option>
                      <option>Corvette</option>
                      <option>Aircraft Carrier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost (₹ Cr)</label>
                    <input 
                      type="number" 
                      value={projectCost}
                      onChange={(e) => setProjectCost(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                    <select 
                      value={priority} 
                      onChange={(e) => setPriority(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client/Customer</label>
                    <input 
                      type="text" 
                      value="Indian Navy"
                      readOnly
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-100 border border-[#D6DEE8] rounded-lg text-xs text-slate-500 focus:outline-none font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#D6DEE8] flex justify-end gap-3 font-outfit">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#D6DEE8] hover:bg-slate-100 text-slate-650 text-xs font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={templates.length === 0}
                  className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-navy-900/10"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
