import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  FolderKanban, Plus, Clock, ShieldAlert, 
  CheckCircle2, Calendar, AlertCircle, Search, Filter 
} from 'lucide-react';

function ProjectsPage({ onSelectProject }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [shipTypeFilter, setShipTypeFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

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

  const fetchData = async () => {
    try {
      const projectsRes = await api.get('/auth/projects');
      setProjects(projectsRes.data);

      if (user.role === 'PROJECT_MANAGER') {
        const templatesRes = await api.get('/templates');
        setTemplates(templatesRes.data);
        if (templatesRes.data.length > 0) {
          setTemplateId(templatesRes.data[0]._id || templatesRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching projects list', err);
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
      setProjectCost('');
      setStartDate('');
      if (templates.length > 0) setTemplateId(templates[0]._id || templates[0].id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    }
  };

  // Filter logic
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.projectIdCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.shipName && p.shipName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesShipType = shipTypeFilter === 'All' || p.shipType === shipTypeFilter;
    const matchesRisk = riskFilter === 'All' || p.predictedRiskCategory === riskFilter;

    return matchesSearch && matchesShipType && matchesRisk;
  });

  const riskColors = {
    Low: 'bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/20',
    Medium: 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20',
    High: 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/20',
    Critical: 'bg-purple-100 text-purple-850 border border-purple-200'
  };

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
            Active Acquisition Programs
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {user.role === 'PROJECT_MANAGER' 
              ? 'Initiate and manage defense ship workspaces and timelines.' 
              : 'Strategic monitoring of current defense acquisition workspaces.'}
          </p>
        </div>
        {user.role === 'PROJECT_MANAGER' && (
          <button 
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md shadow-navy-900/10"
          >
            <Plus size={14} className="stroke-[2.5]" />
            Create Program
          </button>
        )}
      </div>

      {/* FILTERS BAR */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-[#D6DEE8] p-4 rounded-xl shadow-sm flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search programs by code, name, or vessel..."
            className="w-full pl-9 pr-4 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vessel type:</span>
            <select 
              value={shipTypeFilter}
              onChange={(e) => setShipTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
            >
              <option value="All">All Types</option>
              <option>Submarine</option>
              <option>Destroyer</option>
              <option>Frigate</option>
              <option>Corvette</option>
              <option>Aircraft Carrier</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Level:</span>
            <select 
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
            >
              <option value="All">All Risks</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
              <option value="Critical">Critical Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* PROGRAMS CARD GRID */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex-1 flex justify-center items-center py-16">
            <div className="h-8 w-8 border-4 border-[#12355B] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#D6DEE8] rounded-2xl bg-white shadow-sm">
            <FolderKanban className="mx-auto text-slate-400 mb-3" size={32} />
            <p className="text-xs font-bold text-slate-500">No project workspaces match your selection criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
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
                  <h3 className="text-sm font-black text-[#12355B] mt-3 transition-colors font-outfit line-clamp-1">
                    {p.projectName}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                    Vessel: {p.shipName || 'TBD'} ({p.shipClass || 'General'}) | Cost: ₹{p.projectCost || 0} Cr
                  </p>
                </div>

                <div className="border-t border-[#D6DEE8] mt-4 pt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] text-slate-455 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Clock size={9} /> Delay Forecast
                    </p>
                    <p className="text-xs font-black text-[#C62828] mt-0.5">
                      +{p.predictedDelayMonths?.toFixed(1) || '0.0'} Months
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-455 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={9} /> Est Completion
                    </p>
                    <p className="text-xs font-black text-[#12355B] mt-0.5">
                      {p.expectedEndDate ? new Date(p.expectedEndDate).toLocaleDateString('en-GB') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vessel Name</label>
                    <input 
                      type="text" 
                      value={shipName}
                      onChange={(e) => setShipName(e.target.value)}
                      placeholder="e.g. INS Shivalik"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vessel Class</label>
                    <input 
                      type="text" 
                      value={shipClass}
                      onChange={(e) => setShipClass(e.target.value)}
                      placeholder="e.g. Shivalik Class Frigate"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vessel Type</label>
                    <select 
                      value={shipType}
                      onChange={(e) => setShipType(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                    >
                      <option>Submarine</option>
                      <option>Destroyer</option>
                      <option>Frigate</option>
                      <option>Corvette</option>
                      <option>Aircraft Carrier</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost (₹ Cr)</label>
                    <input 
                      type="number" 
                      value={projectCost}
                      onChange={(e) => setProjectCost(e.target.value)}
                      placeholder="e.g. 5400"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Critical">Critical Priority</option>
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Authority / Customer</label>
                    <input 
                      type="text" 
                      value="Indian Navy"
                      readOnly
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-100 border border-[#D6DEE8] rounded-lg text-xs text-slate-500 focus:outline-none font-semibold cursor-not-allowed"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#D6DEE8] flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#D6DEE8] hover:bg-slate-100 text-slate-655 text-xs font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={templates.length === 0}
                  className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
