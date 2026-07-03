import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { FileText, Table } from 'lucide-react';

function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/auth/projects');
        setProjects(res.data);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleDownloadPdf = async (projectId, projectCode) => {
    try {
      const res = await api.get(`/projects/${projectId}/reports/pdf`, { responseType: 'blob' });
      const fileBlob = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Project_Report_${projectCode || 'export'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate PDF report.');
    }
  };

  const handleDownloadExcel = async (projectId, projectCode) => {
    try {
      const res = await api.get(`/projects/${projectId}/reports/excel`, { responseType: 'blob' });
      const fileBlob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileURL = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Project_Report_${projectCode || 'export'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate Excel report.');
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto bg-[#F7F9FC] flex flex-col min-h-0 engineering-grid">
      <div>
        <h1 className="text-xl font-black text-[#12355B] tracking-wide font-outfit uppercase">Executive Status Reports</h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">Generate and download formatted PDF status reports or Excel worksheets for active acquisition projects.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="h-8 w-8 border-4 border-[#12355B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#D6DEE8] rounded-2xl bg-white shadow-sm">
          <FileText className="mx-auto text-slate-400 mb-3" size={32} />
          <p className="text-xs font-bold text-slate-500">No projects found to generate reports.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div key={p._id} className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex flex-col justify-between h-[160px] shadow-sm card-lift">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-[#12355B] bg-[#E8EFF5] px-2 py-0.5 rounded border border-[#D6DEE8] uppercase tracking-widest">{p.projectIdCode}</span>
                  <h3 className="text-sm font-black text-[#12355B] truncate font-outfit">{p.projectName}</h3>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-2.5">Vessel: {p.shipName || 'N/A'} ({p.shipClass || 'N/A'})</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => handleDownloadPdf(p._id, p.projectIdCode)}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-[#D6DEE8] text-[10px] font-bold text-[#C62828] rounded-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileText size={12} />
                  PDF Report
                </button>
                <button
                  onClick={() => handleDownloadExcel(p._id, p.projectIdCode)}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-[#D6DEE8] text-[10px] font-bold text-[#2D6A4F] rounded-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <Table size={12} />
                  Excel Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
