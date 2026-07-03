import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { UserPlus, Search, Edit3, Key, Trash2, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [status, setStatus] = useState('Active');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/users', { name, email, password, role });
      setSuccess('User created successfully!');
      setShowCreateModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('VIEWER');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put(`/users/${selectedUser._id}`, { name, email, role, status });
      setSuccess('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post(`/users/${selectedUser._id}/reset-password`, { newPassword });
      setSuccess(`Password reset successfully for ${selectedUser.name}!`);
      setShowResetModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (id, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.delete(`/users/${id}`);
      setSuccess(`User "${userName}" deleted successfully.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const toggleUserStatus = async (userObj) => {
    setError('');
    setSuccess('');
    const nextStatus = userObj.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/users/${userObj._id}`, {
        status: nextStatus
      });
      setSuccess(`User "${userObj.name}" status updated to ${nextStatus}.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto bg-[#F7F9FC] flex flex-col min-h-0 engineering-grid">
      {/* Toast notifications */}
      {success && (
        <div className="p-4 bg-[#2D6A4F]/10 border border-[#2D6A4F]/25 text-[#2D6A4F] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6DEE8] pb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-black text-[#12355B] font-outfit uppercase">User Account Management</h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Create, edit, deactivate, or delete Project Managers and Viewers.</p>
        </div>
        <button 
          onClick={() => {
            setError('');
            setSuccess('');
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md shadow-navy-900/10"
        >
          <UserPlus size={14} className="stroke-[2.5]" />
          Add User Account
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-[#D6DEE8] p-4 rounded-xl shadow-sm flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-[#F7F9FC] border border-[#D6DEE8] hover:border-[#2F6690] focus:border-[#12355B] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role filter:</span>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B] font-semibold"
          >
            <option value="All">All Roles</option>
            <option value="PROJECT_MANAGER">Project Managers</option>
            <option value="VIEWER">Viewers</option>
          </select>
        </div>
      </div>

      {/* Accounts List Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 w-full bg-white border border-[#D6DEE8] rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#D6DEE8] rounded-2xl bg-white shadow-sm">
          <Search className="mx-auto text-slate-400 mb-3" size={32} />
          <p className="text-xs font-bold text-slate-500">No users match your criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#D6DEE8] rounded-2xl overflow-hidden shadow-sm flex-1 min-h-0 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-[#F7F9FC] text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-[#D6DEE8]">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">System Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6DEE8]">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-[#F7F9FC]/20">
                  <td className="p-4 font-bold text-slate-900">{u.name}</td>
                  <td className="p-4 text-slate-500 font-semibold">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      u.role === 'PROJECT_MANAGER' 
                        ? 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20' 
                        : 'bg-[#2F6690]/10 text-[#2F6690] border-[#2F6690]/20'
                    }`}>
                      {u.role === 'PROJECT_MANAGER' ? 'Project Manager' : 'Viewer'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => u.email !== 'admin@navalpmis.gov' && toggleUserStatus(u)}
                      disabled={u.email === 'admin@navalpmis.gov'}
                      className={`flex items-center gap-1.5 font-bold transition-all ${
                        u.status === 'Active' 
                          ? 'text-[#2D6A4F] hover:text-[#2D6A4F]/80' 
                          : 'text-slate-400 hover:text-slate-650'
                      }`}
                    >
                      {u.status === 'Active' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {u.status}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    {u.email !== 'admin@navalpmis.gov' ? (
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => {
                            setSelectedUser(u);
                            setName(u.name);
                            setEmail(u.email);
                            setRole(u.role);
                            setStatus(u.status);
                            setShowEditModal(true);
                          }}
                          className="text-slate-500 hover:text-[#12355B] font-bold"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedUser(u);
                            setShowResetModal(true);
                          }}
                          className="text-slate-500 hover:text-[#2F6690] font-bold"
                          title="Reset Password"
                        >
                          <Key size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          className="text-slate-500 hover:text-[#C62828] font-bold"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">System Owner</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6DEE8] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#D6DEE8] bg-[#F7F9FC] flex items-center justify-between">
              <h3 className="font-black text-[#12355B] text-sm font-outfit uppercase tracking-wider">Create User Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-[#12355B]">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Brijesh Kumar"
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. pm2@navalpmis.gov"
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Initial Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                >
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="VIEWER">Viewer (Read-Only Observer)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#D6DEE8]">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#D6DEE8] text-slate-650 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6DEE8] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#D6DEE8] bg-[#F7F9FC] flex items-center justify-between">
              <h3 className="font-black text-[#12355B] text-sm font-outfit uppercase tracking-wider">Edit User Details</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="text-slate-400 hover:text-[#12355B]">✕</button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                >
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="VIEWER">Viewer (Read-Only)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive (Deactivated)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#D6DEE8]">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                  className="px-4 py-2 border border-[#D6DEE8] text-slate-655 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#12355B] hover:bg-[#0E2A47] text-white text-xs font-bold rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6DEE8] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#D6DEE8] bg-[#F7F9FC] flex items-center justify-between">
              <h3 className="font-black text-[#12355B] text-sm font-outfit uppercase tracking-wider">Reset Password</h3>
              <button onClick={() => { setShowResetModal(false); setSelectedUser(null); }} className="text-slate-400 hover:text-[#12355B]">✕</button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter a new password for <span className="font-bold text-slate-800">{selectedUser?.name}</span> ({selectedUser?.email}).
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1.5 block w-full px-3 py-2 bg-[#F7F9FC] border border-[#D6DEE8] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#12355B]"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#D6DEE8]">
                <button 
                  type="button" 
                  onClick={() => { setShowResetModal(false); setSelectedUser(null); }}
                  className="px-4 py-2 border border-[#D6DEE8] text-slate-655 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#C62828] hover:bg-[#C62828]/80 text-white text-xs font-bold rounded-lg"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
