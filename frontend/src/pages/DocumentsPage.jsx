import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { 
  Search, FileText, Download, History, 
  FolderOpen, User, Calendar, ExternalLink 
} from 'lucide-react';

function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistoryId, setShowHistoryId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents/all');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (base64Data, filename) => {
    if (base64Data.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = base64Data;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      // Handle standard filepath
      const link = document.createElement('a');
      link.href = `${api.defaults.baseURL.replace('/api', '')}/${base64Data}`;
      link.setAttribute('download', filename);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Filter documents based on query
  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const filenameMatch = doc.filename?.toLowerCase().includes(q);
    const uploaderMatch = doc.uploaderId?.name?.toLowerCase().includes(q);
    const projectCodeMatch = doc.projectId?.projectIdCode?.toLowerCase().includes(q);
    const projectNameMatch = doc.projectId?.projectName?.toLowerCase().includes(q);
    return filenameMatch || uploaderMatch || projectCodeMatch || projectNameMatch;
  });

  // Group filtered documents by project
  const docsByProject = filteredDocs.reduce((acc, doc) => {
    const pId = doc.projectId?._id || 'unknown';
    if (!acc[pId]) {
      acc[pId] = {
        projectInfo: doc.projectId || { projectName: 'General / Unassociated', projectIdCode: 'N/A' },
        docs: []
      };
    }
    acc[pId].docs.push(doc);
    return acc;
  }, {});

  const projectGroups = Object.values(docsByProject);

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto bg-[#F7F9FC] flex flex-col min-h-0 engineering-grid">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6DEE8] pb-5 flex-shrink-0">
        <div>
          <h2 className="text-xl font-black text-[#12355B] tracking-tight uppercase font-outfit">
            Central Document Registry
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            Fleet-wide shared file search & distribution vault
          </p>
        </div>

        {/* Sandbox details */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#E8EFF5] border border-[#D6DEE8] rounded-lg self-start sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2D6A4F] animate-pulse"></span>
          <span className="text-[9px] font-black text-[#12355B] uppercase tracking-widest">Secure Storage</span>
        </div>
      </div>

      {/* Search Input Card */}
      <div className="bg-white border border-[#D6DEE8] p-4 rounded-xl flex items-center gap-3 shadow-sm flex-shrink-0">
        <Search size={15} className="text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents by filename, uploader name, project code or project name..."
          className="flex-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-bold"
        />
      </div>

      {/* Main feed list */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 border-4 border-[#12355B] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : projectGroups.length === 0 ? (
          <div className="bg-white border border-[#D6DEE8] rounded-2xl p-16 text-center text-slate-400 text-xs italic shadow-sm">
            No matching documents found in the vault registry.
          </div>
        ) : (
          projectGroups.map((group) => (
            <div key={group.projectInfo._id || 'unknown'} className="bg-white border border-[#D6DEE8] rounded-2xl shadow-sm overflow-hidden">
              {/* Project Header Banner */}
              <div className="bg-[#E8EFF5] border-b border-[#D6DEE8] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-[#12355B]" />
                  <h3 className="text-xs font-black text-[#12355B] uppercase tracking-wider">
                    {group.projectInfo.projectName}
                  </h3>
                  {group.projectInfo.projectIdCode && (
                    <span className="text-[9px] font-extrabold text-[#2F6690] bg-white border border-[#D6DEE8] px-2 py-0.5 rounded uppercase">
                      {group.projectInfo.projectIdCode}
                    </span>
                  )}
                </div>
                {group.projectInfo.shipClass && (
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Vessel Class: {group.projectInfo.shipClass}
                  </span>
                )}
              </div>

              {/* Document List */}
              <div className="divide-y divide-[#D6DEE8]/60 p-4 space-y-4">
                {group.docs.map((doc) => (
                  <div key={doc._id} className="pt-4 first:pt-0">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="flex gap-3 items-start">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 border border-[#D6DEE8] text-[#12355B] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                          <FileText size={16} />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{doc.filename}</h5>
                          <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-500 font-semibold mt-1">
                            <span className="flex items-center gap-1">
                              <User size={10} className="text-slate-400" />
                              By: {doc.uploaderId?.name || 'System'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} className="text-slate-400" />
                              {new Date(doc.updatedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="px-1.5 py-0.2 bg-[#F1F5F9] border border-slate-200 text-slate-600 rounded">
                              v{doc.version}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Download & History Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button 
                          onClick={() => downloadFile(doc.filepath, doc.filename)}
                          className="px-2.5 py-1.5 bg-[#12355B] hover:bg-[#0E2A47] text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                          title="Download document"
                        >
                          <Download size={11} className="stroke-[2.5]" />
                          Download
                        </button>
                        <button 
                          onClick={() => setShowHistoryId(showHistoryId === doc._id ? null : doc._id)}
                          className="px-2 py-1.5 border border-[#D6DEE8] hover:bg-slate-100 text-slate-500 hover:text-[#12355B] rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                          title="Show version history"
                        >
                          <History size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Version History Drawer */}
                    {showHistoryId === doc._id && (
                      <div className="bg-[#F7F9FC] border border-[#D6DEE8] rounded-xl p-3 space-y-2 mt-3 divide-y divide-[#D6DEE8]/60">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider pb-1">Version History</p>
                        {doc.versions?.map((ver, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px] py-2 first:pt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#2F6690]">v{ver.version}</span>
                              <span className="text-slate-400">|</span>
                              <span className="font-semibold text-slate-600">
                                Uploaded by {ver.uploaderId?.name || 'System'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] text-slate-450 font-medium">
                                {new Date(ver.timestamp).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <button 
                                onClick={() => downloadFile(ver.filepath, `${doc.filename.split('.')[0]}_v${ver.version}.${doc.filename.split('.')[1] || ''}`)}
                                className="text-[#2F6690] hover:text-[#12355B] hover:underline text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-0.5"
                              >
                                <Download size={9} />
                                Get
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DocumentsPage;
