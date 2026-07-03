import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Anchor, Shield, AlertCircle } from 'lucide-react';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail) => {
    setError('');
    setLoading(true);
    try {
      await login(quickEmail, 'password123');
    } catch (err) {
      setError(err.message || 'Sandbox login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Engineering accent background lines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-40 h-40 border border-white rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 border border-white rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-[1px] h-96 bg-white"></div>
        <div className="absolute top-1/4 left-1/2 w-96 h-[1px] bg-white"></div>
      </div>

      <div className="w-full max-w-md bg-white border border-[#D6DEE8] p-8 rounded-2xl shadow-xl relative z-10 animate-in fade-in duration-200">
        <div className="flex flex-col items-center gap-2 mb-8">
          <span className="h-12 w-12 rounded-xl bg-[#E8EFF5] border border-[#D6DEE8] flex items-center justify-center text-[#12355B]">
            <Anchor size={22} className="stroke-[2.5]" />
          </span>
          <h1 className="text-xl font-black text-[#12355B] tracking-wider font-outfit mt-2 uppercase">Navy PMIS</h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Acquisition Command Gateway</p>
        </div>

        {error && (
          <div className="p-3.5 mb-5 bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828] rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <p className="flex-1 text-left">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. pm@navalpmis.gov"
              className="mt-1.5 block w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B] transition-all font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 block w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B] transition-all font-semibold"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-[#12355B] hover:bg-[#0E2A47] active:bg-[#081a2e] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-navy-900/10 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating Gateway...' : 'Access Portal'}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#D6DEE8]"></div>
          </div>
          <span className="relative bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sandbox Gateways</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button 
            onClick={() => handleQuickLogin('admin@navalpmis.gov')}
            className="p-2.5 border border-[#D6DEE8] hover:border-[#2F6690] hover:bg-[#E8EFF5]/30 rounded-xl text-left transition-all group"
          >
            <p className="text-[10px] font-extrabold text-[#12355B]">Akshat</p>
            <p className="text-[8px] text-[#D97706] font-bold uppercase tracking-wider mt-0.5 group-hover:translate-x-0.5 transition-transform">Project Manager</p>
          </button>

          <button 
            onClick={() => handleQuickLogin('pm@navalpmis.gov')}
            className="p-2.5 border border-[#D6DEE8] hover:border-[#2F6690] hover:bg-[#E8EFF5]/30 rounded-xl text-left transition-all group"
          >
            <p className="text-[10px] font-extrabold text-[#12355B]">Brijesh</p>
            <p className="text-[8px] text-[#D97706] font-bold uppercase tracking-wider mt-0.5 group-hover:translate-x-0.5 transition-transform">Project Manager</p>
          </button>

          <button 
            onClick={() => handleQuickLogin('engineer@navalpmis.gov')}
            className="p-2.5 border border-[#D6DEE8] hover:border-[#2F6690] hover:bg-[#E8EFF5]/30 rounded-xl text-left transition-all group"
          >
            <p className="text-[10px] font-extrabold text-[#12355B]">Vishank</p>
            <p className="text-[8px] text-[#2F6690] font-bold uppercase tracking-wider mt-0.5 group-hover:translate-x-0.5 transition-transform">Viewer</p>
          </button>

          <button 
            onClick={() => handleQuickLogin('viewer@navalpmis.gov')}
            className="p-2.5 border border-[#D6DEE8] hover:border-[#2F6690] hover:bg-[#E8EFF5]/30 rounded-xl text-left transition-all group"
          >
            <p className="text-[10px] font-extrabold text-[#12355B]">Mradul</p>
            <p className="text-[8px] text-[#2F6690] font-bold uppercase tracking-wider mt-0.5 group-hover:translate-x-0.5 transition-transform">Viewer</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
