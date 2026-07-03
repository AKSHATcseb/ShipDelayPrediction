import React from 'react';
import { AlertCircle, Lightbulb, TrendingUp, Percent, ShieldCheck } from 'lucide-react';

function DashboardCharts({ project, topDrivers, recommendations }) {
  if (!project) return null;

  const riskColors = {
    Low: 'text-[#2D6A4F] bg-[#2D6A4F]/10 border-[#2D6A4F]/20',
    Medium: 'text-[#D97706] bg-[#D97706]/10 border-[#D97706]/20',
    High: 'text-[#C62828] bg-[#C62828]/10 border-[#C62828]/20',
    Critical: 'text-purple-800 bg-purple-100 border-purple-200'
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Forecast Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Delay Forecast Card */}
        <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex flex-col justify-between shadow-sm card-lift relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Delay Forecast</p>
            <TrendingUp size={14} className="text-[#2F6690]" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-[#C62828] font-outfit">
              +{project.predictedDelayMonths?.toFixed(1) || '0.0'} Months
            </h3>
            <p className="text-[10px] font-bold text-[#C62828] mt-1 flex items-center gap-0.5 uppercase tracking-wide">
              <Percent size={10} /> {project.predictedDelayPct?.toFixed(1) || '0.0'}% Delay Factor
            </p>
          </div>
        </div>

        {/* Risk Level Card */}
        <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex flex-col justify-between shadow-sm card-lift">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Delay Risk Level</p>
            <AlertCircle size={14} className="text-[#D97706]" />
          </div>
          <div className="mt-4">
            <span className={`text-xs font-black font-outfit px-2.5 py-1 rounded-lg border inline-block uppercase tracking-wider ${riskColors[project.predictedRiskCategory || 'Low']}`}>
              {project.predictedRiskCategory || 'Low'} Risk
            </span>
            <p className="text-[10px] text-slate-500 font-semibold mt-2.5">
              Confidence Index: {project.predictionConfidence || '85'}%
            </p>
          </div>
        </div>

        {/* Completion Target Card */}
        <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl flex flex-col justify-between shadow-sm card-lift">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Est. Handover Date</p>
            <ShieldCheck size={14} className="text-[#2D6A4F]" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-black text-[#12355B] font-outfit">
              {project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString('en-GB') : '-'}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              Based on live CPM & ML pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Explanations & Recommendations Column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ML Risk Drivers */}
        <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl shadow-sm">
          <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider flex items-center gap-2 mb-4">
            <AlertCircle size={14} className="text-[#C62828] stroke-[2.5]" />
            Top Delay Drivers (ML Explainer)
          </h4>
          {topDrivers && topDrivers.length > 0 ? (
            <ul className="space-y-3">
              {topDrivers.map((driver, idx) => (
                <li key={idx} className="text-xs flex gap-2.5 items-start">
                  <span className="h-4 w-4 rounded bg-[#C62828]/10 text-[#C62828] flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{driver.driver || driver}</p>
                    <p className="text-[9px] text-[#C62828] font-bold uppercase tracking-wider mt-0.5">Impact Score: {driver.impact || 'High'}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No active risk drivers found. Timeline is executing on schedule.</p>
          )}
        </div>

        {/* ML Mitigation Recommendations */}
        <div className="bg-white border border-[#D6DEE8] p-5 rounded-2xl shadow-sm">
          <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider flex items-center gap-2 mb-4">
            <Lightbulb size={14} className="text-[#2F6690] stroke-[2.5]" />
            Mitigation Recommendations (Recommendation Engine)
          </h4>
          {recommendations && recommendations.length > 0 ? (
            <ul className="space-y-3">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs flex gap-2.5 items-start">
                  <span className="h-4 w-4 rounded bg-[#E8EFF5] text-[#2F6690] flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 leading-relaxed">{rec.recommendation || rec}</p>
                    <p className="text-[9px] text-[#2F6690] font-bold uppercase tracking-wider mt-1">Priority: {rec.priority || 'Medium'}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No mitigation recommendations needed at this stage.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;
