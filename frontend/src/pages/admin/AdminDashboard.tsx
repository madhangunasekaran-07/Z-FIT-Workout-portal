import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Dumbbell,
  Plus,
  ArrowRight,
  UserPlus,
  Sparkles,
  Activity
} from 'lucide-react';
import api from '../../api/client';
import { AdminDashboardStats, RecentActivityItem } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<AdminDashboardStats>('/admin/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'WORKOUT_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'USER_REGISTERED':
        return <UserPlus className="w-4 h-4 text-cyan-400" />;
      case 'PROGRAM_EXPIRING':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top Banner Header */}
      <header className="py-4 px-4 md:px-8 border-b border-white/5 bg-dark-950/80 backdrop-blur-md sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-heading">
            Admin Command Center
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Monitor customer training progression, program assignments, and gym activity
          </p>
        </div>

        {/* Quick Create buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/admin/customers')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 border border-white/10 text-xs font-semibold transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={() => navigate('/admin/programs')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-glow-brand"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Build Program</span>
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Aggregating system statistics...</p>
          </div>
        ) : (
          <>
            {/* Top 5 Stat Cards (Section 14) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Total Customers */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                  <span>Total Customers</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {stats?.total_customers || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  {stats?.active_customers || 0} Active accounts
                </div>
              </div>

              {/* Active Customers */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                  <span>Active Athletes</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-heading">
                  {stats?.active_customers || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Currently training
                </div>
              </div>

              {/* Active Programs */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                  <span>Active Programs</span>
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {stats?.active_programs || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Ready to assign
                </div>
              </div>

              {/* Completed Today */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                  <span>Workouts Today</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {stats?.completed_workouts_today || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Sessions logged
                </div>
              </div>

              {/* Expiring Soon */}
              <div className="glass-card rounded-2xl p-4 border border-white/5 col-span-2 md:col-span-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                  <span>Expiring Soon</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-heading">
                  {stats?.programs_expiring_soon || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Within 5 days
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity Feed (Section 14) */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Recent Customer Activity</span>
                  </h3>
                  <span className="text-xs text-slate-400">Live progression events</span>
                </div>

                {stats?.recent_activities && stats.recent_activities.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {stats.recent_activities.map((act: RecentActivityItem) => (
                      <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-dark-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                            {getActivityIcon(act.action_type)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{act.description}</div>
                            <div className="text-[11px] text-slate-400">{act.user_email}</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(act.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No recent activity recorded yet.
                  </p>
                )}
              </div>

              {/* Management Shortcuts */}
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Quick Navigation
                  </h3>

                  <button
                    onClick={() => navigate('/admin/customers')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/5 text-left transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                          Customer Management
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Assign splits, due dates, reset days
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                  </button>

                  <button
                    onClick={() => navigate('/admin/programs')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/5 text-left transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                          Program Split Builder
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Create PPL, Upper/Lower, custom sequences
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                  </button>

                  <button
                    onClick={() => navigate('/admin/exercises')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/5 text-left transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <Dumbbell className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                          Exercise Master Library
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Add exercises, muscle groups, instructions
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                  </button>
                </div>

                {/* Core rule reminder callout */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sequence-Based Progression Active</span>
                  </div>
                  Customer workouts advance strictly when completed by the athlete. The calendar never skips workouts.
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
