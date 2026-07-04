import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import PresenceIndicator from '../components/PresenceIndicator.jsx';
import DashboardCharts from '../components/DashboardCharts.jsx';
import ActivityList from '../components/ActivityList.jsx';
import ActivityModal from '../components/ActivityModal.jsx';
import GanttChart from '../components/GanttChart.jsx';
import CommentsSection from '../components/CommentsSection.jsx';
import DocumentManager from '../components/DocumentManager.jsx';
import WorkflowCanvas from '../components/WorkflowCanvas.jsx';
import { ArrowLeft, Users, Calendar, FolderKanban, MessageSquare, FileText, Shield, UserPlus, Table, GitFork } from 'lucide-react';

function ProjectWorkspace({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('activities'); // 'activities', 'gantt', 'discussion', 'documents', 'access'
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // Real-time Prediction additions
  const [topDrivers, setTopDrivers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Access Control / Invite fields
  const [collaborators, setCollaborators] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('PROJECT_MANAGER');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copiedLink, setCopiedLink] = useState('');
  
  const { user } = useAuth();
  const socket = useSocket();

  const handleDownloadPdfReport = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/reports/pdf`, { responseType: 'blob' });
      const fileBlob = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Project_Report_${project.projectIdCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate PDF report.');
    }
  };

  const handleDownloadExcelReport = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/reports/excel`, { responseType: 'blob' });
      const fileBlob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileURL = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Project_Report_${project.projectIdCode}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate Excel report.');
    }
  };

  const fetchProjectDetails = async () => {
    try {
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data);
      
      const actsRes = await api.get(`/activities/project/${projectId}`);
      setActivities(actsRes.data);

      const membersRes = await api.get(`/projects/${projectId}/members`);
      setCollaborators(membersRes.data);

      // Fetch Real-time prediction analytics
      const predictRes = await api.get(`/projects/${projectId}/predictions`);
      setTopDrivers(predictRes.data.topDrivers || []);
      setRecommendations(predictRes.data.recommendations || []);
    } catch (err) {
      console.error('Failed to load project details', err);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const [workflowData, setWorkflowData] = useState(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);

  const fetchProjectWorkflow = async () => {
    setLoadingWorkflow(true);
    try {
      const res = await api.get(`/projects/${projectId}/workflow`);
      setWorkflowData(res.data);
    } catch (err) {
      console.error('Failed to load project workflow graph', err);
    } finally {
      setLoadingWorkflow(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'workflow') {
      fetchProjectWorkflow();
    }
  }, [activeTab, projectId]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;
    
    // Join project room
    socket.emit('join-project', { projectId });

    socket.on('activity-updated-broadcast', (data) => {
      if (data.projectId === projectId) {
        fetchProjectDetails();
      }
    });

    socket.on('collaborators-updated-broadcast', (data) => {
      if (data.projectId === projectId) {
        fetchProjectDetails();
      }
    });

    return () => {
      socket.emit('leave-project', { projectId });
      socket.off('activity-updated-broadcast');
      socket.off('collaborators-updated-broadcast');
    };
  }, [socket, projectId]);

  const handleInviteCollaborator = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setCopiedLink('');
    try {
      const res = await api.post(`/projects/${projectId}/invite`, {
        email: inviteEmail,
        role: inviteRole
      });
      setInviteSuccess('Invitation generated successfully!');
      setInviteEmail('');
      if (res.data?.invitationLink) {
        setCopiedLink(res.data.invitationLink);
      }
      fetchProjectDetails();
      // Notify other collaborators
      if (socket) {
        socket.emit('collaborators-updated', { projectId });
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleAcceptInviteDirectly = async (link) => {
    try {
      const token = link.split('token=')[1];
      await api.post(`/projects/invitations/accept?token=${token}`);
      setInviteSuccess('Sandbox Accept successful!');
      setCopiedLink('');
      fetchProjectDetails();
      if (socket) {
        socket.emit('collaborators-updated', { projectId });
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to accept invitation');
    }
  };

  const handleRemoveCollaborator = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this collaborator?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${targetUserId}`);
      fetchProjectDetails();
      if (socket) {
        socket.emit('collaborators-updated', { projectId });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleEditActivitySuccess = () => {
    setSelectedActivity(null);
    fetchProjectDetails();
    if (socket) {
      socket.emit('activity-updated', { projectId });
    }
  };

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F7F9FC]">
        <div className="h-8 w-8 border-4 border-[#12355B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Resolve user role globally
  const myRole = user?.role;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto bg-[#F7F9FC] flex flex-col min-h-0 engineering-grid">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6DEE8] pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 border border-[#D6DEE8] hover:bg-slate-100 text-slate-500 hover:text-[#12355B] bg-white rounded-lg transition-all"
            title="Return to Dashboard"
          >
            <ArrowLeft size={14} className="stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black font-outfit text-[#12355B] bg-[#E8EFF5] px-2 py-0.5 rounded border border-[#D6DEE8] uppercase tracking-widest">
                {project.projectIdCode}
              </span>
              <h2 className="text-base font-black text-[#12355B] tracking-wide font-outfit uppercase">{project.projectName}</h2>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Vessel Type: {project.shipType || 'N/A'} ({project.shipClass}) | Access Authority: <span className="text-[#2F6690] font-black uppercase">{myRole === 'PROJECT_MANAGER' ? 'Project Manager' : 'Observer'}</span>
            </p>
          </div>
        </div>

        {/* Action Panel with Report Downloads and Presence */}
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleDownloadPdfReport}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-[#D6DEE8] rounded-lg text-[10px] font-bold text-slate-650 transition-all flex items-center gap-1.5"
            title="Download Executive PDF Report"
          >
            <FileText size={12} className="text-[#C62828]" />
            PDF Blueprint Report
          </button>
          <button 
            onClick={handleDownloadExcelReport}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-[#D6DEE8] rounded-lg text-[10px] font-bold text-slate-650 transition-all flex items-center gap-1.5"
            title="Download Executive Excel Report"
          >
            <Table size={12} className="text-[#2D6A4F]" />
            Excel worksheet
          </button>
          <PresenceIndicator projectId={projectId} />
        </div>
      </div>

      {/* Real-time Dashboard Charts (integrated predictions) */}
      <DashboardCharts 
        project={project} 
        topDrivers={topDrivers} 
        recommendations={recommendations} 
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#D6DEE8] gap-2 flex-shrink-0">
        <button 
          onClick={() => setActiveTab('activities')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 -mb-[1px] ${activeTab === 'activities' ? 'border-[#12355B] text-[#12355B]' : 'border-transparent text-slate-500 hover:text-[#2F6690]'}`}
        >
          <FolderKanban size={13} />
          Activities & Updates
        </button>
        <button 
          onClick={() => setActiveTab('gantt')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 -mb-[1px] ${activeTab === 'gantt' ? 'border-[#12355B] text-[#12355B]' : 'border-transparent text-slate-500 hover:text-[#2F6690]'}`}
        >
          <Calendar size={13} />
          Gantt & Schedule
        </button>
        <button 
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 -mb-[1px] ${activeTab === 'workflow' ? 'border-[#12355B] text-[#12355B]' : 'border-transparent text-slate-500 hover:text-[#2F6690]'}`}
        >
          <GitFork size={13} />
          Workflow Diagram
        </button>
        <button 
          onClick={() => setActiveTab('discussion')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 -mb-[1px] ${activeTab === 'discussion' ? 'border-[#12355B] text-[#12355B]' : 'border-transparent text-slate-500 hover:text-[#2F6690]'}`}
        >
          <MessageSquare size={13} />
          Comments & Suggestions
        </button>
        <button 
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 -mb-[1px] ${activeTab === 'documents' ? 'border-[#12355B] text-[#12355B]' : 'border-transparent text-slate-500 hover:text-[#2F6690]'}`}
        >
          <FileText size={13} />
          Document Library
        </button>
        {myRole === 'PROJECT_MANAGER' && (
          <button 
            onClick={() => setActiveTab('access')}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 -mb-[1px] ${activeTab === 'access' ? 'border-[#12355B] text-[#12355B]' : 'border-transparent text-slate-500 hover:text-[#2F6690]'}`}
          >
            <Shield size={13} />
            Access Control
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0">
        {activeTab === 'activities' && (
          <ActivityList 
            activities={activities} 
            onEditActivity={setSelectedActivity} 
            projectRole={myRole}
          />
        )}

        {activeTab === 'gantt' && (
          <GanttChart project={project} activities={activities} />
        )}

        {activeTab === 'workflow' && (
          <div className="h-full w-full">
            {loadingWorkflow ? (
              <div className="flex items-center justify-center h-full text-xs font-bold text-slate-500">
                Building workflow flowchart nodes and connections...
              </div>
            ) : workflowData ? (
              <WorkflowCanvas
                nodes={workflowData.nodes}
                edges={workflowData.edges}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-bold text-[#C62828]">
                Failed to construct workflow graph layout.
              </div>
            )}
          </div>
        )}

        {activeTab === 'discussion' && (
          <CommentsSection projectId={projectId} />
        )}

        {activeTab === 'documents' && (
          <DocumentManager projectId={projectId} projectRole={myRole} />
        )}

        {activeTab === 'access' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invite Panel */}
            {myRole === 'PROJECT_MANAGER' && (
              <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl h-fit shadow-sm">
                <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider flex items-center gap-2 mb-4">
                  <UserPlus size={14} className="text-[#2F6690]" />
                  Invite Collaborator
                </h4>
                
                {inviteError && (
                  <div className="p-2.5 mb-3 bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828] rounded-xl text-[10px] font-bold text-center">
                    {inviteError}
                  </div>
                )}
                {inviteSuccess && (
                  <div className="p-2.5 mb-3 bg-[#2D6A4F]/10 border border-[#2D6A4F]/25 text-[#2D6A4F] rounded-xl text-[10px] font-bold text-center">
                    {inviteSuccess}
                  </div>
                )}
                {copiedLink && (
                  <div className="bg-[#F7F9FC] border border-[#D6DEE8] rounded p-3 mb-4 flex flex-col gap-2">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest break-all select-all font-mono">
                      {copiedLink}
                    </p>
                    <button 
                      onClick={() => handleAcceptInviteDirectly(copiedLink)}
                      className="py-1.5 bg-[#2F6690] hover:bg-[#3A7CA5] text-white rounded text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      Accept Directly (Sandbox Login)
                    </button>
                  </div>
                )}

                <form onSubmit={handleInviteCollaborator} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="collaborator@navalpmis.gov"
                      className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Project Role</label>
                    <select 
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                    >
                      <option value="PROJECT_MANAGER">Project Manager</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-navy-900/10"
                  >
                    Generate Invitation
                  </button>
                </form>
              </div>
            )}

            {/* Collaborators List */}
            <div className={`bg-white border border-[#D6DEE8] p-5 rounded-2xl shadow-sm ${
              myRole === 'PROJECT_MANAGER' ? 'lg:col-span-2' : 'lg:col-span-3'
            }`}>
              <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider flex items-center gap-2 mb-4">
                <Users size={14} className="text-[#2F6690]" />
                Project Collaborators ({collaborators.length})
              </h4>

              <div className="divide-y divide-slate-100">
                {collaborators.map((member) => (
                  <div key={member._id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">{member.userId?.name}</p>
                        <span className="text-[8px] font-black text-[#2F6690] bg-[#E8EFF5] px-1.5 py-0.5 rounded border border-[#D6DEE8] uppercase tracking-wider">
                          {member.role === 'PROJECT_MANAGER' ? 'Project Manager' : 'Viewer'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-semibold mt-0.5">{member.userId?.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${member.status === 'Active' ? 'bg-[#2D6A4F]/10 text-[#2D6A4F] border-[#2D6A4F]/20' : 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20'}`}>
                        {member.status}
                      </span>
                      {myRole === 'PROJECT_MANAGER' && (
                        <button 
                          onClick={() => handleRemoveCollaborator(member.userId?._id)}
                          className="text-[10px] font-bold text-[#C62828] hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Activity Modal */}
      {selectedActivity && (
        <ActivityModal 
          activity={selectedActivity} 
          onClose={() => setSelectedActivity(null)} 
          onSaveSuccess={handleEditActivitySuccess}
        />
      )}
    </div>
  );
}

export default ProjectWorkspace;
