import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  CheckCircle,
  Calendar,
  TrendingUp,
  BarChart3,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Header } from '../../components/common/Header';
import api from '../../api/client';
import { ProgressStats, WorkoutLog } from '../../types';

export const ProgressPage: React.FC = () => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get<ProgressStats>('/progress');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const toggleExpandLog = (id: number) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Fitness Progress & Analytics"
        subtitle="Track consistency, strength progression, personal records, and workout logs"
        statusTag={stats?.status}
        daysRemaining={stats?.days_remaining}
        currentStreak={stats?.current_streak}
      />

      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Computing performance analytics...</p>
          </div>
        ) : (
          <>
            {/* Top Metric Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Overall Completion */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Completion</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white font-heading">
                  {stats?.overall_completion_percent || 0}%
                </div>
                <div className="w-full bg-dark-900 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats?.overall_completion_percent || 0}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-medium">
                  {stats?.completed_workouts || 0} of {stats?.total_program_days || 0} finished
                </div>
              </div>

              {/* Current Streak */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Current Streak</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400 font-heading">
                  {stats?.current_streak || 0} <span className="text-base text-slate-400 font-semibold">Days</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-4 font-medium">
                  Longest Streak: <span className="text-white font-bold">{stats?.longest_streak || 0} Days</span>
                </div>
              </div>

              {/* Remaining Workouts */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Remaining</span>
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-white font-heading">
                  {stats?.remaining_workouts || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-4 font-medium">
                  Next: Day {stats?.current_workout_day || 1}
                </div>
              </div>

              {/* Program Due Status */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Timeline</span>
                  <Calendar className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-black text-white font-heading">
                  {stats?.days_remaining !== undefined ? Math.max(0, stats.days_remaining) : 0}
                  <span className="text-base text-slate-400 font-semibold"> d left</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-4 font-medium">
                  Due: {stats?.due_date || 'N/A'}
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Workout Completion Over Time */}
              <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Weekly Program Completion Rate</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adherence percentage across 4-week training blocks
                    </p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.completion_chart || []}>
                      <defs>
                        <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                      <XAxis dataKey="week_label" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} unit="%" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D111A',
                          borderColor: '#222D46',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completion_rate"
                        name="Completion Rate"
                        stroke="#10B981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#completionGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Weekly Workout Consistency */}
              <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span>Weekly Consistency Distribution</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Session frequency across weekdays
                    </p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.consistency_chart || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                      <XAxis dataKey="day_name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D111A',
                          borderColor: '#222D46',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Bar
                        dataKey="workouts_count"
                        name="Workouts Completed"
                        fill="#06B6D4"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Personal Records Table (Section 10 & 12) */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Personal Records (PRs)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your highest actual weights and reps recorded across workouts
                  </p>
                </div>
              </div>

              {stats?.personal_records && stats.personal_records.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stats.personal_records.map((pr) => (
                    <div
                      key={pr.id}
                      className="p-4 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between hover:border-amber-500/20 transition"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{pr.exercise_name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {pr.reps} reps • {new Date(pr.achieved_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black font-heading text-amber-400">
                          {pr.weight_kg} <span className="text-xs text-slate-400">kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No personal records logged yet. Complete workouts with weights to establish your PRs.
                </p>
              )}
            </div>

            {/* Workout History Audit Log */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span>Recent Workout History</span>
              </h3>

              {stats?.recent_history && stats.recent_history.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_history.map((log: WorkoutLog) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div
                        key={log.id}
                        className="rounded-xl bg-dark-900 border border-white/5 overflow-hidden transition"
                      >
                        <div
                          onClick={() => toggleExpandLog(log.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-850/60 transition"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 font-black flex items-center justify-center text-xs">
                              D{log.day_order_completed}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{log.day_name}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-dark-800">
                                  {log.day_type}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {new Date(log.completed_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} • {Math.round(log.duration_seconds / 60)} min
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 text-slate-400">
                            <span className="text-xs hidden sm:inline">
                              {log.sets?.length || 0} Sets Logged
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Collapsible details */}
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-white/5 bg-dark-950/40 space-y-3 animate-fade-in">
                            {log.notes && (
                              <p className="text-xs text-slate-300 italic">"{log.notes}"</p>
                            )}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-slate-400 border-b border-white/5">
                                    <th className="pb-1.5">Exercise</th>
                                    <th className="pb-1.5">Set</th>
                                    <th className="pb-1.5">Actual Weight</th>
                                    <th className="pb-1.5">Actual Reps</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                  {log.sets?.map((s) => (
                                    <tr key={s.id}>
                                      <td className="py-1.5 font-medium text-white">{s.exercise_name}</td>
                                      <td className="py-1.5 text-slate-400">Set {s.set_number}</td>
                                      <td className="py-1.5">{s.actual_weight_kg} kg</td>
                                      <td className="py-1.5">{s.actual_reps} reps</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">
                  No workouts completed yet. Your logs will appear here after finishing a session.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
