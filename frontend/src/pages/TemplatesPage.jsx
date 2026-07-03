import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { LayoutGrid, Plus, Trash2, Edit3, ClipboardList, CheckCircle2, AlertTriangle, Copy, ShieldAlert } from 'lucide-react';

function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Modals / Modes
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [shipType, setShipType] = useState('Submarine');
  const [activities, setActivities] = useState([
    { name: 'Cabinet Committee Approval (AoN)', category: 'Administrative', sequenceNumber: 1, dependencyList: [], durationMonths: 6, historicalRiskWeight: 35, responsibleDepartment: 'Cabinet Committee', isMilestone: true, isCriticalPath: true }
  ]);
  const [duplicateNewName, setDuplicateNewName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categories = ['Administrative', 'Design & Engineering', 'Procurement', 'Construction', 'Trials & Commissioning', 'Other'];

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates?includeArchived=true');
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddActivityRow = () => {
    const nextSeq = activities.length > 0 ? Math.max(...activities.map(a => a.sequenceNumber)) + 1 : 1;
    setActivities([
      ...activities,
      {
        name: '',
        category: 'Other',
        sequenceNumber: nextSeq,
        dependencyList: [],
        durationMonths: 3,
        historicalRiskWeight: 50,
        responsibleDepartment: 'Shipyard',
        isMilestone: false,
        isCriticalPath: false
      }
    ]);
  };

  const handleRemoveActivityRow = (index) => {
    setActivities(activities.filter((_, idx) => idx !== index));
  };

  const handleActivityFieldChange = (index, field, value) => {
    const updated = [...activities];
    if (field === 'dependencyList') {
      const parsed = value.split(',')
        .map(v => parseInt(v.trim()))
        .filter(v => !isNaN(v));
      updated[index][field] = parsed;
    } else if (field === 'sequenceNumber' || field === 'durationMonths' || field === 'historicalRiskWeight') {
      updated[index][field] = parseFloat(value) || 0;
    } else if (field === 'isMilestone' || field === 'isCriticalPath') {
      updated[index][field] = !!value;
    } else {
      updated[index][field] = value;
    }
    setActivities(updated);
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!templateName.trim()) {
      setError('Template name is required.');
      return;
    }
    if (activities.length === 0) {
      setError('Template must contain at least one activity.');
      return;
    }
    for (const act of activities) {
      if (!act.name.trim()) {
        setError('Each activity must have a name.');
        return;
      }
    }

    try {
      if (isEditMode && selectedTemplate) {
        const res = await api.put(`/templates/${selectedTemplate._id}`, {
          name: templateName,
          description: templateDesc,
          shipType,
          activities
        });
        setSuccess('Template blueprint updated successfully!');
        setSelectedTemplate(res.data);
      } else {
        const res = await api.post('/templates', {
          name: templateName,
          description: templateDesc,
          shipType,
          activities
        });
        setSuccess('Template blueprint created successfully!');
        setSelectedTemplate(res.data);
      }
      setShowCreateModal(false);
      fetchTemplates();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template blueprint');
    }
  };

  const handleDuplicateTemplate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!duplicateNewName.trim()) {
      setError('Please enter a new blueprint name.');
      return;
    }
    try {
      const res = await api.post(`/templates/${selectedTemplate._id}/duplicate`, {
        newName: duplicateNewName
      });
      setSuccess('Blueprint duplicated successfully!');
      setSelectedTemplate(res.data);
      setShowDuplicateModal(false);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to duplicate blueprint');
    }
  };

  const handleArchiveTemplate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive "${name}"?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/templates/${id}`);
      setSuccess('Template blueprint archived successfully.');
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive template blueprint');
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateDesc('');
    setShipType('Submarine');
    setActivities([
      { name: 'Cabinet Committee Approval (AoN)', category: 'Administrative', sequenceNumber: 1, dependencyList: [], durationMonths: 6, historicalRiskWeight: 35, responsibleDepartment: 'Cabinet Committee', isMilestone: true, isCriticalPath: true }
    ]);
    setIsEditMode(false);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto bg-[#F7F9FC] flex flex-col min-h-0 engineering-grid">
      
      {/* Toast alert notifications */}
      {success && (
        <div className="p-4 bg-[#2D6A4F]/10 border border-[#2D6A4F]/25 text-[#2D6A4F] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6DEE8] pb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-black text-[#12355B] font-outfit uppercase">Project Lifecycle Blueprints</h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Design and maintain ship acquisition templates and workflows.</p>
        </div>
        <button 
          onClick={() => {
            setError('');
            setSuccess('');
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md shadow-navy-900/10"
        >
          <Plus size={14} className="stroke-[2.5]" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Templates List */}
        <div className="lg:col-span-1 bg-white border border-[#D6DEE8] p-5 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
          <h3 className="text-xs font-black text-[#12355B] uppercase tracking-wider mb-4 flex items-center gap-2 flex-shrink-0">
            <ClipboardList size={14} className="text-[#2F6690]" />
            Blueprints ({templates.length})
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>)}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">No templates designed yet.</p>
            ) : (
              templates.map((t) => (
                <div 
                  key={t._id}
                  onClick={() => {
                    setSelectedTemplate(t);
                    setError('');
                    setSuccess('');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 card-lift ${
                    selectedTemplate?._id === t._id 
                      ? 'bg-[#E8EFF5] border-[#2F6690]/60' 
                      : 'bg-white border-[#D6DEE8] hover:border-[#2F6690]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-[#12355B] line-clamp-1">{t.name}</h4>
                    {t.isArchived && (
                      <span className="text-[8px] font-black bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-slate-300">Archived</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">{t.description || 'No description provided.'}</p>
                  <p className="text-[9px] text-[#2F6690] font-extrabold uppercase mt-2.5 tracking-wider">{t.activities?.length || 0} Stages/Tasks | {t.shipType}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Template Detail Area */}
        <div className="lg:col-span-2 bg-white border border-[#D6DEE8] p-6 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
          {selectedTemplate ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Detail Header */}
              <div className="flex justify-between items-start border-b border-[#D6DEE8] pb-4 mb-4 flex-shrink-0">
                <div>
                  <h3 className="text-sm font-black text-[#12355B] font-outfit uppercase">{selectedTemplate.name}</h3>
                  <p className="text-xs text-slate-550 mt-1 leading-relaxed">{selectedTemplate.description || 'No blueprint description configured.'}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setTemplateName(selectedTemplate.name);
                      setTemplateDesc(selectedTemplate.description || '');
                      setShipType(selectedTemplate.shipType || 'Submarine');
                      setActivities(selectedTemplate.activities.map(({ _id, ...rest }) => rest));
                      setIsEditMode(true);
                      setShowCreateModal(true);
                    }}
                    className="p-2 border border-[#D6DEE8] hover:bg-slate-100 text-slate-650 hover:text-[#12355B] rounded-lg transition-all"
                    title="Edit Template"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      setDuplicateNewName(`${selectedTemplate.name} (Copy)`);
                      setShowDuplicateModal(true);
                    }}
                    className="p-2 border border-[#D6DEE8] hover:bg-slate-100 text-slate-650 hover:text-[#12355B] rounded-lg transition-all"
                    title="Duplicate Template"
                  >
                    <Copy size={12} />
                  </button>
                  {!selectedTemplate.isArchived && (
                    <button 
                      onClick={() => handleArchiveTemplate(selectedTemplate._id, selectedTemplate.name)}
                      className="p-2 border border-[#D6DEE8] hover:bg-[#C62828]/10 text-slate-650 hover:text-[#C62828] rounded-lg transition-all"
                      title="Archive Template"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Activities table */}
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex-shrink-0">Blueprint Flow stages</h4>
              <div className="flex-1 overflow-y-auto border border-[#D6DEE8] rounded-xl">
                <table className="w-full border-collapse text-left text-xs text-slate-700">
                  <thead>
                    <tr className="bg-[#F7F9FC] text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-[#D6DEE8]">
                      <th className="p-3 w-12 text-center">Seq</th>
                      <th className="p-3">Activity / Task Stage Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Duration</th>
                      <th className="p-3 text-center">Risk</th>
                      <th className="p-3">Department</th>
                      <th className="p-3 text-center">Milestone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6DEE8]">
                    {selectedTemplate.activities?.map((act, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-[#F7F9FC]/20">
                        <td className="p-3 text-center font-extrabold text-[#12355B]">{act.sequenceNumber}</td>
                        <td className="p-3">
                          <div>
                            <p className="font-bold text-slate-900">{act.name}</p>
                            {act.dependencyList?.length > 0 && (
                              <p className="text-[8px] text-slate-500 font-semibold mt-0.5">
                                Depends on: {act.dependencyList.map(s => `#${s}`).join(', ')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {act.category}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">{act.durationMonths}m</td>
                        <td className="p-3 text-center font-semibold text-slate-500">{act.historicalRiskWeight}%</td>
                        <td className="p-3 text-slate-500">{act.responsibleDepartment || '-'}</td>
                        <td className="p-3 text-center">
                          {act.isMilestone ? (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#2F6690]/10 text-[#2F6690] border border-[#2F6690]/20 uppercase tracking-wider">Milestone</span>
                          ) : (
                            <span className="text-[8px] text-slate-400 font-black">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <ClipboardList size={36} className="text-slate-400 mb-3" />
              <p className="text-xs font-bold text-slate-550">No template selected.</p>
              <p className="text-[10px] text-slate-450 mt-1">Select a blueprint from the list to view its activity flow and options.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE & EDIT TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6DEE8] w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#D6DEE8] bg-[#F7F9FC] flex items-center justify-between flex-shrink-0">
              <h3 className="font-black text-[#12355B] text-sm font-outfit uppercase tracking-wider">
                {isEditMode ? 'Edit Project Template Blueprint' : 'Create Project Template Blueprint'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-[#12355B]">✕</button>
            </div>

            <form onSubmit={handleCreateTemplate} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Meta details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Template Name</label>
                    <input 
                      type="text" 
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Corvette Bid Template"
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Ship Type</label>
                    <select 
                      value={shipType}
                      onChange={(e) => setShipType(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    >
                      <option>Submarine</option>
                      <option>Destroyer</option>
                      <option>Frigate</option>
                      <option>Corvette</option>
                      <option>Aircraft Carrier</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                    <input 
                      type="text" 
                      value={templateDesc}
                      onChange={(e) => setTemplateDesc(e.target.value)}
                      placeholder="Enter blueprint overview..."
                      className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    />
                  </div>
                </div>

                {/* Activities list editor */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-[#D6DEE8] pb-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workflow stages & sequence</h4>
                    <button 
                      type="button"
                      onClick={handleAddActivityRow}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-[#D6DEE8] text-[10px] font-black uppercase text-[#12355B] rounded-lg transition-all flex items-center gap-1"
                    >
                      <Plus size={10} className="stroke-[2.5]" /> Add Stage
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-[#D6DEE8] rounded-xl">
                    <table className="w-full text-xs text-left border-collapse min-w-[900px] text-slate-700">
                      <thead>
                        <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-[#F7F9FC] border-b border-[#D6DEE8]">
                          <th className="p-3 w-14 text-center">Seq</th>
                          <th className="p-3 w-56">Activity Name</th>
                          <th className="p-3 w-36">Category</th>
                          <th className="p-3 w-20 text-center">Dur (mo)</th>
                          <th className="p-3 w-20 text-center">Risk (%)</th>
                          <th className="p-3 w-32">Dept</th>
                          <th className="p-3 w-28 text-center">Predecessors</th>
                          <th className="p-3 w-16 text-center">Milestone</th>
                          <th className="p-3 w-16 text-center">Critical</th>
                          <th className="p-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D6DEE8] bg-white">
                        {activities.map((act, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <input 
                                type="number" 
                                value={act.sequenceNumber}
                                onChange={(e) => handleActivityFieldChange(index, 'sequenceNumber', e.target.value)}
                                className="w-full text-center py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded text-xs text-slate-900"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={act.name}
                                onChange={(e) => handleActivityFieldChange(index, 'name', e.target.value)}
                                placeholder="Activity / stage name"
                                className="w-full px-2 py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded text-xs text-slate-900 placeholder-slate-400"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <select 
                                value={act.category}
                                onChange={(e) => handleActivityFieldChange(index, 'category', e.target.value)}
                                className="w-full px-1 py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded text-xs text-slate-900 font-semibold"
                              >
                                {categories.map(c => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                value={act.durationMonths}
                                onChange={(e) => handleActivityFieldChange(index, 'durationMonths', e.target.value)}
                                className="w-full text-center py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded text-xs text-slate-900"
                                min="1"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                value={act.historicalRiskWeight}
                                onChange={(e) => handleActivityFieldChange(index, 'historicalRiskWeight', e.target.value)}
                                className="w-full text-center py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded text-xs text-slate-900"
                                min="0" max="100"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={act.responsibleDepartment || ''}
                                onChange={(e) => handleActivityFieldChange(index, 'responsibleDepartment', e.target.value)}
                                placeholder="e.g. Shipyard"
                                className="w-full px-2 py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded text-xs text-slate-900 placeholder-slate-400"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={act.dependencyList?.join(', ') || ''}
                                onChange={(e) => handleActivityFieldChange(index, 'dependencyList', e.target.value)}
                                placeholder="e.g. 1, 2"
                                className="w-full text-center py-1 bg-[#F7F9FC] border border-[#D6DEE8] rounded text-xs text-slate-900 placeholder-slate-400"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input 
                                type="checkbox" 
                                checked={act.isMilestone}
                                onChange={(e) => handleActivityFieldChange(index, 'isMilestone', e.target.checked)}
                                className="h-3.5 w-3.5 accent-[#12355B] bg-slate-50 border-[#D6DEE8] rounded"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input 
                                type="checkbox" 
                                checked={act.isCriticalPath}
                                onChange={(e) => handleActivityFieldChange(index, 'isCriticalPath', e.target.checked)}
                                className="h-3.5 w-3.5 accent-[#12355B] bg-slate-50 border-[#D6DEE8] rounded"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button 
                                type="button"
                                onClick={() => handleRemoveActivityRow(index)}
                                className="p-1.5 text-slate-400 hover:text-[#C62828] hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#D6DEE8] flex justify-end gap-3 flex-shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#D6DEE8] hover:bg-slate-100 text-slate-650 text-xs font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-navy-900/10"
                >
                  {isEditMode ? 'Save Blueprint' : 'Instantiate Blueprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUPLICATE TEMPLATE MODAL */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6DEE8] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#D6DEE8] bg-[#F7F9FC] flex items-center justify-between">
              <h3 className="font-black text-[#12355B] text-sm font-outfit uppercase tracking-wider">Duplicate Template</h3>
              <button onClick={() => { setShowDuplicateModal(false); setSelectedTemplate(null); }} className="text-slate-400 hover:text-[#12355B]">✕</button>
            </div>
            <form onSubmit={handleDuplicateTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duplicated Template Name</label>
                <input 
                  type="text" 
                  value={duplicateNewName}
                  onChange={(e) => setDuplicateNewName(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#D6DEE8]">
                <button 
                  type="button" 
                  onClick={() => { setShowDuplicateModal(false); setSelectedTemplate(null); }}
                  className="px-4 py-2 border border-[#D6DEE8] text-slate-650 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg"
                >
                  Confirm Duplicate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;
