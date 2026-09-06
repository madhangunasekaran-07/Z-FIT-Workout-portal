import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Calendar,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  Flame,
  Shield,
  Clock,
  ArrowRight
} from 'lucide-react';
import api from '../../api/client';
import { CustomerDetail, Program, Level } from '../../types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerDetail[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [customerProfileData, setCustomerProfileData] = useState<any>(null);

  // Forms
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLevelId, setNewLevelId] = useState<number | ''>('');

  const [assignProgramId, setAssignProgramId] = useState<number | ''>('');
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignDueDate, setAssignDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [assignStartDay, setAssignStartDay] = useState(1);

  const [resetDayOrder, setResetDayOrder] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes, lRes] = await Promise.all([
        api.get<CustomerDetail[]>('/admin/customers'),
        api.get<Program[]>('/admin/programs'),
        api.get<Level[]>('/admin/levels'),
      ]);
      setCustomers(cRes.data);
      setPrograms(pRes.data);
      setLevels(lRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/admin/customers', {
        full_name: newFullName,
        email: newEmail,
        password: newPassword,
        level_id: newLevelId ? Number(newLevelId) : null,
        is_active: true,
      });
      setShowCreateModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewLevelId('');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create customer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !assignProgramId) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/customers/${selectedCustomer.id}/assign-program`, {
        user_id: selectedCustomer.id,
        program_id: Number(assignProgramId),
        start_date: assignStartDate,
        due_date: assignDueDate,
        start_day_order: assignStartDay,
      });
      setShowAssignModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign program');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/customers/${selectedCustomer.id}/reset-progress`, {
        new_day_order: resetDayOrder,
      });
      setShowResetModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset progress');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (customer: CustomerDetail) => {
    try {
      await api.put(`/admin/customers/${customer.id}/toggle-status`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle status');
    }
  };

  const openCustomerProfile = async (customer: CustomerDetail) => {
    setSelectedCustomer(customer);
    setShowProfileDrawer(true);
    try {
      const res = await api.get(`/admin/customers/${customer.id}`);
      setCustomerProfileData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.assigned_program_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="py-4 px-4 md:px-8 border-b border-white/5 bg-dark-950/80 backdrop-blur-md sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-heading">
            Customer Management
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Manage customer accounts, assign workout sequences, set due dates, and monitor adherence
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-glow-brand self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
        {/* Search & Filter bar */}
        <div className="glass-card rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or program..."
              className="w-full pl-10 pr-4 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-semibold">
            {filteredCustomers.length} Customer{filteredCustomers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Customer Table (Section 15) */}
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-dark-900 text-slate-400 uppercase tracking-wider border-b border-white/5 font-semibold">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Assigned Program</th>
                  <th className="py-3 px-4 text-center">Current Day</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading customer records...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No customers found. Click "New Customer" to register an athlete.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const progressPct =
                      c.total_days && c.total_days > 0
                        ? Math.min(Math.round((c.completed_workouts_count / c.total_days) * 100), 100)
                        : 0;

                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition">
                        {/* Name & Email */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => openCustomerProfile(c)}
                            className="text-left group"
                          >
                            <div className="font-bold text-white group-hover:text-emerald-400 transition">
                              {c.full_name}
                            </div>
                            <div className="text-[11px] text-slate-400">{c.email}</div>
                          </button>
                        </td>

                        {/* Level */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-dark-800 border border-white/5 font-medium text-[11px] text-slate-300">
                            {c.level_name || 'Standard'}
                          </span>
                        </td>

                        {/* Program & Progress */}
                        <td className="py-3.5 px-4">
                          {c.assigned_program_name ? (
                            <div>
                              <div className="font-semibold text-white truncate max-w-xs">
                                {c.assigned_program_name}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className="w-16 bg-dark-900 rounded-full h-1 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {progressPct}% ({c.completed_workouts_count}/{c.total_days})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No program assigned</span>
                          )}
                        </td>

                        {/* Current Day */}
                        <td className="py-3.5 px-4 text-center">
                          {c.current_day_order ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              Day {c.current_day_order}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4">
                          {c.due_date ? (
                            <div>
                              <span className="font-medium text-white">{c.due_date}</span>
                              <div className="text-[10px] text-slate-400">
                                {c.assignment_status === 'COMPLETED' ? (
                                  <span className="text-cyan-400">Completed</span>
                                ) : (
                                  'Active target'
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(c)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${
                              c.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {c.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedCustomer(c);
                                setAssignProgramId(c.assigned_program_id || (programs[0]?.id || ''));
                                setShowAssignModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-cyan-400 hover:text-cyan-300 transition"
                              title="Assign Program / Due Date"
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomer(c);
                                setResetDayOrder(c.current_day_order || 1);
                                setShowResetModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-amber-400 hover:text-amber-300 transition"
                              title="Reset Workout Progress"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openCustomerProfile(c)}
                              className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white transition"
                              title="View Customer Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-850 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-card-dark space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold font-heading">Register New Customer</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Arun Prakash"
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="arun@example.com"
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Workout Level
                </label>
                <select
                  value={newLevelId}
                  onChange={(e) => setNewLevelId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select a Level (Optional)</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-glow-brand disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN PROGRAM MODAL (Section 15 & 9) */}
      {showAssignModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-850 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-card-dark space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold font-heading">Assign Workout Program</h3>
                <p className="text-xs text-slate-400 mt-0.5">To: {selectedCustomer.full_name}</p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignProgram} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Select Program Split
                </label>
                <select
                  required
                  value={assignProgramId}
                  onChange={(e) => setAssignProgramId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select a workout split</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.days_count || 0} days) {p.level_name ? `• ${p.level_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={assignStartDate}
                    onChange={(e) => setAssignStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Start At Sequence Day
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={assignStartDay}
                  onChange={(e) => setAssignStartDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default is Day 1. You can start the athlete at any day in the sequence.
                </span>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-glow-cyan disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PROGRESS MODAL */}
      {showResetModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-850 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-card-dark space-y-4 text-white">
            <h3 className="text-lg font-bold font-heading text-amber-400">
              Reset Workout Progress
            </h3>
            <p className="text-xs text-slate-300">
              Reset <span className="font-bold text-white">{selectedCustomer.full_name}</span>'s active sequence position. Historical workout logs and PRs are fully preserved.
            </p>

            <form onSubmit={handleResetProgress} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">
                  New Current Day Order
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={resetDayOrder}
                  onChange={(e) => setResetDayOrder(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 rounded-xl bg-dark-800 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-glow-amber disabled:opacity-50"
                >
                  {actionLoading ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE DETAIL DRAWER */}
      {showProfileDrawer && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-900 border-l border-white/10 w-full max-w-lg h-full p-6 overflow-y-auto space-y-6 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-xl font-bold font-heading">{selectedCustomer.full_name}</h3>
                <p className="text-xs text-slate-400">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setShowProfileDrawer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {customerProfileData ? (
              <div className="space-y-6">
                {/* Active assignment info */}
                <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Active Program Assignment
                  </div>
                  {customerProfileData.assignment ? (
                    <div className="space-y-2 text-xs">
                      <div className="text-base font-bold text-white">
                        {customerProfileData.assignment.program_name}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400">
                        <div>
                          Start: <span className="text-white">{customerProfileData.assignment.start_date}</span>
                        </div>
                        <div>
                          Due: <span className="text-white">{customerProfileData.assignment.due_date}</span>
                        </div>
                        <div>
                          Current: <span className="text-emerald-400 font-bold">Day {customerProfileData.assignment.current_day_order}</span>
                        </div>
                        <div>
                          Status: <span className="text-white uppercase">{customerProfileData.assignment.status}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No active assignment.</p>
                  )}
                </div>

                {/* Workout History Audit Logs */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Logged Workouts ({customerProfileData.workout_logs?.length || 0})
                  </div>
                  {customerProfileData.workout_logs?.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customerProfileData.workout_logs.map((log: any) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-dark-850 border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">
                              Day {log.day_order_completed}: {log.day_name}
                            </div>
                            <div className="text-slate-400 text-[10px]">
                              {new Date(log.completed_at).toLocaleDateString()} • {log.sets_count} sets logged
                            </div>
                          </div>
                          <span className="text-emerald-400 font-bold uppercase text-[10px]">
                            {log.day_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No workouts logged yet.</p>
                  )}
                </div>

                {/* Personal Records */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Personal Records Established
                  </div>
                  {customerProfileData.personal_records?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {customerProfileData.personal_records.map((pr: any) => (
                        <div key={pr.id} className="p-3 rounded-xl bg-dark-850 border border-white/5 text-xs">
                          <div className="text-slate-400 truncate">{pr.exercise_name}</div>
                          <div className="text-base font-black text-amber-400 mt-0.5">
                            {pr.weight_kg} kg
                          </div>
                          <div className="text-[10px] text-slate-500">{pr.reps} reps</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No PRs yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">Loading profile...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
