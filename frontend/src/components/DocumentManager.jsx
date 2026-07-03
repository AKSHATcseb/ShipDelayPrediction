import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { Upload, FileText, Download, History, Trash } from 'lucide-react';

function DocumentManager({ projectId, activityId, projectRole }) {
  const [documents, setDocuments] = useState([]);
  const [showHistoryId, setShowHistoryId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const socket = useSocket();

  const fetchDocs = async () => {
    try {
      const res = await api.get(`/documents/project/${projectId}${activityId ? `?activityId=${activityId}` : ''}`);
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [projectId, activityId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('document-added', (doc) => {
      setDocuments(prev => [doc, ...prev]);
    });

    socket.on('document-version-added', (doc) => {
      setDocuments(prev => prev.map(d => d._id === doc._id ? doc : d));
    });

    socket.on('document-deleted', ({ documentId }) => {
      setDocuments(prev => prev.filter(d => d._id !== documentId));
    });

    return () => {
      socket.off('document-added');
      socket.off('document-version-added');
      socket.off('document-deleted');
    };
  }, [socket]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          await api.post(`/documents/project/${projectId}`, {
            activityId: activityId || null,
            filename: file.name,
            mimetype: file.type,
            base64Data
          });
          // Reset file input
          e.target.value = '';
          // Refresh list immediately
          fetchDocs();
        } catch (err) {
          console.error('Upload failed:', err);
          alert('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        console.error('File read failed');
        setUploading(false);
      };
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleUploadNewVersion = async (documentId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          await api.post(`/documents/${documentId}/version`, {
            filename: file.name,
            base64Data
          });
          // Reset file input
          e.target.value = '';
          // Refresh list immediately
          fetchDocs();
        } catch (err) {
          console.error('Version upload failed:', err);
          alert('Upload failed: ' + (err.response?.data?.message || err.message));
        }
      };
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoc = async (id) => {
    try {
      await api.delete(`/documents/${id}?projectId=${projectId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadFile = (base64Data, filename) => {
    if (base64Data.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Mock download for: ${filename}`);
    }
  };

  return (
    <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex flex-col h-[400px] shadow-sm">
      <div className="flex items-center justify-between border-b border-[#D6DEE8] pb-3 mb-4 flex-shrink-0">
        <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider">
          Shared Document Library
        </h4>
        <label className="px-3 py-1.5 bg-[#12355B] hover:bg-[#0E2A47] text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-navy-900/10">
          <Upload size={12} className="stroke-[2.5]" />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {documents.length === 0 ? (
          <div className="text-center text-slate-400 text-xs py-16 italic">
            No shared documents in this library.
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc._id} className="p-3 bg-slate-50 border border-[#D6DEE8]/60 rounded-xl space-y-2 card-lift shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-lg bg-[#E8EFF5] border border-[#D6DEE8] text-[#12355B] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{doc.filename}</h5>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                      v{doc.version} | Uploaded by: {doc.uploaderId?.name}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => downloadFile(doc.filepath, doc.filename)}
                    className="p-1 text-slate-400 hover:text-[#2F6690] transition-colors"
                    title="Download current version"
                  >
                    <Download size={12} />
                  </button>
                  <label className="p-1 text-slate-400 hover:text-[#2F6690] transition-colors cursor-pointer" title="Upload new version">
                    <Upload size={12} />
                    <input type="file" onChange={(e) => handleUploadNewVersion(doc._id, e)} className="hidden" />
                  </label>
                  <button 
                    onClick={() => setShowHistoryId(showHistoryId === doc._id ? null : doc._id)}
                    className="p-1 text-slate-400 hover:text-[#2F6690] transition-colors"
                    title="Version history"
                  >
                    <History size={12} />
                  </button>
                  {projectRole === 'PROJECT_MANAGER' && (
                    <button 
                      onClick={() => handleDeleteDoc(doc._id)}
                      className="p-1 text-slate-400 hover:text-[#C62828] transition-colors"
                      title="Delete document"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Version History Sub-panel */}
              {showHistoryId === doc._id && (
                <div className="bg-[#F7F9FC] border border-[#D6DEE8]/85 rounded-lg p-2.5 space-y-2 mt-2 divide-y divide-[#D6DEE8]/60">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Version History</p>
                  {doc.versions?.map((ver, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] py-1.5 first:pt-1">
                      <div>
                        <p className="font-bold text-slate-700">Version {ver.version}</p>
                        <p className="text-[8px] text-slate-400 font-semibold mt-0.5">By {ver.uploaderId?.name || 'Unknown'}</p>
                      </div>
                      <button 
                        onClick={() => downloadFile(ver.filepath, `v${ver.version}_${doc.filename}`)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-[#D6DEE8] rounded text-slate-650 hover:text-[#2F6690] font-bold flex items-center gap-1 transition-all"
                      >
                        <Download size={8} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DocumentManager;
