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
  Activity,
  Zap,
  TrendingUp,
  BarChart3,
  Trophy,
  Flame,
  Award,
  Brain,
  ShieldAlert,
  CheckCircle,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../../api/client';
import { AdminDashboardStats, AdminAnalytics, RecentActivityItem, AdminMLAnalytics } from '../../types';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#0D111A',
    borderColor: '#222D46',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
  },
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [mlAnalytics, setMlAnalytics] = useState<AdminMLAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'ai'>('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsRes, analyticsRes, mlRes] = await Promise.all([
          api.get<AdminDashboardStats>('/admin/stats'),
          api.get<AdminAnalytics>('/admin/analytics').catch(() => null),
          api.get<AdminMLAnalytics>('/ml/admin/analytics').catch(() => null),
        ]);
        setStats(statsRes.data);
        if (analyticsRes) setAnalytics(analyticsRes.data);
        if (mlRes) setMlAnalytics(mlRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
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
            Monitor customer training progression, program assignments, and gym analytics
          </p>
        </div>

        {/* Quick Action & Tab buttons */}
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
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-dark-900/80 border border-white/5 rounded-2xl p-1 max-w-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'overview'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Operations Feed</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Gym Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'ai'
                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-glow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Brain className="w-4 h-4 text-violet-400" />
            <span>AI Progression</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Aggregating gym metrics...</p>
          </div>
        ) : activeTab === 'overview' ? (
          /* ================= OVERVIEW TAB ================= */
          <div className="space-y-6 animate-fade-in">
            {/* Top 5 Stat Cards */}
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
              {/* Recent Activity Feed */}
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
          </div>
        ) : activeTab === 'analytics' ? (
          /* ================= GYM ANALYTICS TAB ================= */
          <div className="space-y-6 animate-fade-in">
            {/* 6 Aggregated KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Customers</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white font-heading">
                  {analytics?.total_customers ?? stats?.total_customers ?? 0}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                  {analytics?.active_customers ?? stats?.active_customers ?? 0} active
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Completed</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-heading">
                  {analytics?.total_completed_workouts ?? 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  of {analytics?.total_scheduled_workouts ?? 0} scheduled
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Avg Completion</span>
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white font-heading">
                  {analytics?.avg_completion_rate ?? 0}%
                </div>
                <div className="w-full bg-dark-900 rounded-full h-1 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${analytics?.avg_completion_rate || 0}%` }}
                  />
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Gym Volume</span>
                  <Zap className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-xl font-black text-violet-400 font-heading truncate">
                  {(analytics?.total_training_volume_kg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">kg lifted total</div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Active Today</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-heading">
                  {stats?.completed_workouts_today || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">sessions logged</div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Expiring</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-400 font-heading">
                  {stats?.programs_expiring_soon || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">due in ≤5 days</div>
              </div>
            </div>

            {/* 6-Week Training Volume Trend Chart */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    <span>Gym-Wide Weekly Training Volume Trend</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Aggregated weight lifted across all athletes over the last 6 weeks</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.weekly_volume_trend || []}>
                    <defs>
                      <linearGradient id="adminVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                    <XAxis dataKey="period_label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v.toLocaleString()}kg`} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: any, name: string) => [
                        name === 'volume_kg' ? `${Number(v).toLocaleString()} kg` : `${v} sessions`,
                        name === 'volume_kg' ? 'Volume' : 'Workouts',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume_kg"
                      name="volume_kg"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#adminVolumeGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tables Grid: Popular Exercises & Most Active Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Exercises Table */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                    <span>Most Frequently Performed Exercises</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">By total sets</span>
                </div>

                {analytics?.popular_exercises && analytics.popular_exercises.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-wider border-b border-white/5">
                          <th className="pb-2">Exercise</th>
                          <th className="pb-2 text-center">Muscle Group</th>
                          <th className="pb-2 text-center">Sets</th>
                          <th className="pb-2 text-center">Volume</th>
                          <th className="pb-2 text-center">Athletes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {analytics.popular_exercises.map((ex, idx) => (
                          <tr key={ex.exercise_id} className="hover:bg-white/5 transition">
                            <td className="py-2.5 font-semibold text-white flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-dark-900 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span>{ex.exercise_name}</span>
                            </td>
                            <td className="py-2.5 text-center text-slate-400">
                              <span className="px-2 py-0.5 rounded-full bg-dark-900 border border-white/5 text-[10px]">
                                {ex.muscle_group || 'General'}
                              </span>
                            </td>
                            <td className="py-2.5 text-center font-bold text-white">{ex.total_sets}</td>
                            <td className="py-2.5 text-center text-violet-400 font-semibold">
                              {ex.total_volume_kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
                            </td>
                            <td className="py-2.5 text-center text-cyan-400 font-medium">{ex.unique_athletes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No exercise sets logged yet.
                  </p>
                )}
              </div>

              {/* Most Active Customers Leaderboard (Privacy Safe: Athlete name, no emails) */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Most Active Athletes Leaderboard</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Top contributors</span>
                </div>

                {analytics?.most_active_customers && analytics.most_active_customers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-wider border-b border-white/5">
                          <th className="pb-2">Athlete</th>
                          <th className="pb-2 text-center">Workouts</th>
                          <th className="pb-2 text-center">Volume</th>
                          <th className="pb-2 text-center">Streak</th>
                          <th className="pb-2 text-right">Last Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {analytics.most_active_customers.map((athlete, idx) => (
                          <tr key={athlete.user_id} className="hover:bg-white/5 transition">
                            <td className="py-2.5 font-semibold text-white flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                idx === 0
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : idx === 1
                                  ? 'bg-slate-300/20 text-slate-200'
                                  : idx === 2
                                  ? 'bg-amber-700/20 text-amber-500'
                                  : 'bg-dark-900 text-slate-400'
                              }`}>
                                {idx + 1}
                              </span>
                              <span>{athlete.athlete_name}</span>
                            </td>
                            <td className="py-2.5 text-center font-bold text-emerald-400">
                              {athlete.workouts_completed}
                            </td>
                            <td className="py-2.5 text-center text-violet-400 font-semibold">
                              {athlete.total_volume_kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                                <Flame className="w-3 h-3 text-amber-400" />
                                {athlete.current_streak}d
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-slate-400 text-[11px]">
                              {athlete.last_active_date || 'Recent'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No athlete activity logged yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ================= AI PROGRESSION INTELLIGENCE TAB ================= */
          <div className="space-y-6 animate-fade-in">
            {/* Header / Intro Card */}
            <div className="glass-card rounded-2xl p-6 border border-violet-500/20 bg-gradient-to-r from-violet-950/30 via-dark-900/60 to-emerald-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1.5">
                      <Brain className="w-3 h-3 text-violet-400" />
                      ML Progression Engine Active
                    </span>
                    <span className="text-xs text-slate-400">Ridge Regression & RF Heuristics</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-white font-heading tracking-tight">
                    Gym-Wide Progression & Athlete Fatigue Intelligence
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Automated sequence analysis continuously monitors overload trajectory across all active customers, surfacing potential lift plateaus, volume drops, and next-session recommendations.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Athletes Monitored</div>
                    <div className="text-xl font-black text-white">{mlAnalytics?.total_active_customers ?? 0} Active</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4 AI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Athletes Monitored */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Monitored</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {mlAnalytics?.total_active_customers ?? 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Active training logs
                </div>
              </div>

              {/* Progressing Rate */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Progressing</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-heading">
                  {mlAnalytics?.average_progress_rate_pct ?? 0}%
                </div>
                <div className="w-full bg-dark-900 rounded-full h-1 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${mlAnalytics?.average_progress_rate_pct || 0}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  {mlAnalytics?.customers_improving_count ?? 0} athletes increasing 1RM
                </div>
              </div>

              {/* Plateau Alerts */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Stagnation</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-heading">
                  {mlAnalytics?.customers_plateaued_count ?? 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Possible lift plateaus detected
                </div>
              </div>

              {/* Fatigue Risk Alerts */}
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Fatigue Signals</span>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-heading">
                  {mlAnalytics?.customers_fatigued_count ?? 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Volume drops (&gt;15% decline)
                </div>
              </div>
            </div>

            {/* Insights and Actionable Recommendations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gym-Wide Algorithmic Insights */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span>Progression Surveillance Insights</span>
                  </h3>
                  <span className="text-xs text-slate-400">Live synthesis</span>
                </div>

                {mlAnalytics?.summary_insights && mlAnalytics.summary_insights.length > 0 ? (
                  <div className="space-y-3">
                    {mlAnalytics.summary_insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-dark-900/80 border border-white/5 flex items-start gap-3 hover:border-violet-500/20 transition"
                      >
                        <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
                          {insight}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No gym-wide progression alerts at this time.
                  </div>
                )}
              </div>

              {/* Coach Intervention Guide */}
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Coach Decision Support</span>
                  </h3>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                    <div className="font-bold text-emerald-300 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>For Progressing Athletes</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Reinforce current program adherence. Z Fit AI auto-recommends conservative +1.25kg upper body / +2.5kg lower body micro-loads.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>For Stagnated Lifts</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Suggest varying accessory rep ranges (e.g. 8-10 → 10-12) or scheduling a 1-week 10% deload to rebuild stimulus.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                    <div className="font-bold text-rose-300 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>For Fatigue Signals</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Athletes with &gt;15% volume drop across recent sessions may benefit from an extra rest day before high-load compounds.
                    </p>
                  </div>
                </div>

                {/* Algorithmic transparency notice */}
                <div className="p-4 rounded-2xl bg-dark-900 border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-slate-300 block">
                    Algorithmic Transparency
                  </span>
                  Predictions utilize scikit-learn Ridge regression &amp; Random Forest with chronological features, clamped safely within -15% to +10% of recent performance.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
