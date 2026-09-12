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
  ChevronUp,
  Zap,
  Target,
  Star,
  BookOpen,
  Search,
  Award
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
  CartesianGrid,
  ReferenceDot
} from 'recharts';
import { Header } from '../../components/common/Header';
import api from '../../api/client';
import {
  ProgressStats,
  WorkoutLog,
  ExerciseHistoryOut,
  LoggedExercise,
  PersonalRecord
} from '../../types';

type ProgressTab = 'overview' | 'volume' | 'exercises' | 'history';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#0D111A',
    borderColor: '#222D46',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
  }
};

export const ProgressPage: React.FC = () => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');

  // Exercise History state
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryOut | null>(null);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Workout History state
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, exercisesRes] = await Promise.all([
          api.get<ProgressStats>('/progress'),
          api.get<LoggedExercise[]>('/progress/exercises'),
        ]);
        setStats(statsRes.data);
        setLoggedExercises(exercisesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const fetchWorkoutHistory = async () => {
    if (workoutLogs.length > 0) return;
    setHistoryLoading(true);
    try {
      const res = await api.get<WorkoutLog[]>('/workouts/history');
      setWorkoutLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchExerciseHistory = async (exerciseId: number) => {
    setExerciseLoading(true);
    setSelectedExerciseId(exerciseId);
    setExerciseHistory(null);
    try {
      const res = await api.get<ExerciseHistoryOut>(`/progress/exercise-history/${exerciseId}`);
      setExerciseHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setExerciseLoading(false);
    }
  };

  const handleTabChange = (tab: ProgressTab) => {
    setActiveTab(tab);
    if (tab === 'history') fetchWorkoutHistory();
  };

  const filteredExercises = loggedExercises.filter(ex =>
    ex.exercise_name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    (ex.muscle_group || '').toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Fitness Analytics" subtitle="Progress tracking and performance data" />
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Computing performance analytics...</p>
        </div>
      </div>
    );
  }

  const tabs: { id: ProgressTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'volume', label: 'Volume', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'exercises', label: 'Exercises', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <BookOpen className="w-4 h-4" /> },
  ];

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
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-dark-900/80 border border-white/5 rounded-2xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {stats?.completed_workouts || 0} of {stats?.total_program_days || 0} sessions
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Streak</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400 font-heading">
                  {stats?.current_streak || 0} <span className="text-base text-slate-400 font-semibold">days</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-4 font-medium">
                  Longest: <span className="text-white font-bold">{stats?.longest_streak || 0} days</span>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>This Week</span>
                  <Calendar className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-cyan-400 font-heading">
                  {stats?.workouts_this_week || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-4 font-medium">
                  Month: <span className="text-white font-bold">{stats?.workouts_this_month || 0} sessions</span>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Total Volume</span>
                  <Zap className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-black text-violet-400 font-heading">
                  {(stats?.total_training_volume_kg || 0).toFixed(0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">kg lifted lifetime</div>
              </div>
            </div>

            {/* Completion Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Weekly Completion Rate
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Workout adherence over last 4 weeks</p>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.completion_chart || []}>
                      <defs>
                        <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                      <XAxis dataKey="week_label" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                      <Tooltip {...tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="completion_rate"
                        name="Completion %"
                        stroke="#10B981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#completionGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Weekday Consistency
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Sessions per day of week</p>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.consistency_chart || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                      <XAxis dataKey="day_name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="workouts_count" name="Workouts" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* PRs */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Personal Records
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Your best performances across all exercises</p>
              </div>
              {stats?.personal_records && stats.personal_records.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stats.personal_records.map((pr: PersonalRecord) => (
                    <div
                      key={pr.id}
                      className="p-4 rounded-xl bg-dark-900 border border-white/5 hover:border-amber-500/20 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-bold text-white leading-tight">{pr.exercise_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{pr.reps} reps</div>
                          {pr.previous_weight_kg && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              Prev: {pr.previous_weight_kg} kg × {pr.previous_reps}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-xl font-black font-heading text-amber-400">
                            {pr.weight_kg} <span className="text-xs text-slate-400">kg</span>
                          </div>
                          {pr.estimated_1rm && (
                            <div className="text-[10px] text-slate-500">
                              ~{pr.estimated_1rm.toFixed(1)} 1RM
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-2">
                        {new Date(pr.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No personal records yet. Complete workouts with weights to establish your PRs.
                </p>
              )}
            </div>
          </div>
        )}

        {/* VOLUME TAB */}
        {activeTab === 'volume' && (
          <div className="space-y-6 animate-fade-in">
            {/* Volume Chart */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  Weekly Training Volume
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Total kg lifted (Weight × Reps) per week</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.volume_chart || []}>
                    <defs>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                    <XAxis dataKey="period_label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}kg`} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: any) => [`${Number(value).toFixed(0)} kg`, 'Volume']}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume_kg"
                      name="Volume"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#volumeGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Workout frequency bar chart */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Workout Frequency Per Week
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Number of sessions completed each week</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.volume_chart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                    <XAxis dataKey="period_label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} sessions`, 'Workouts']} />
                    <Bar dataKey="workouts_count" name="Workouts" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Volume Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Lifetime Volume', value: `${(stats?.total_training_volume_kg || 0).toFixed(0)} kg`, color: 'text-violet-400' },
                { label: 'Sessions This Week', value: String(stats?.workouts_this_week || 0), color: 'text-cyan-400' },
                { label: 'Sessions This Month', value: String(stats?.workouts_this_month || 0), color: 'text-emerald-400' },
              ].map((item, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 border border-white/5 text-center">
                  <div className={`text-2xl font-black font-heading ${item.color}`}>{item.value}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXERCISE HISTORY TAB */}
        {activeTab === 'exercises' && (
          <div className="space-y-6 animate-fade-in">
            {/* Exercise Selector */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                Select Exercise to Analyse
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              {loggedExercises.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  No exercise history yet. Complete workouts to see your exercise progression here.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.exercise_id}
                      onClick={() => fetchExerciseHistory(ex.exercise_id)}
                      className={`p-3 rounded-xl text-left text-xs transition ${
                        selectedExerciseId === ex.exercise_id
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-dark-900 border border-white/5 text-slate-300 hover:border-emerald-500/20 hover:text-white'
                      }`}
                    >
                      <div className="font-bold leading-tight">{ex.exercise_name}</div>
                      {ex.muscle_group && <div className="text-slate-500 mt-0.5">{ex.muscle_group}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Exercise History Detail */}
            {exerciseLoading && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            )}

            {exerciseHistory && !exerciseLoading && (
              <div className="space-y-6 animate-fade-in">
                {/* Exercise Header */}
                <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">{exerciseHistory.muscle_group}</div>
                    <h3 className="text-xl font-black text-white font-heading">{exerciseHistory.exercise_name}</h3>
                    <div className="text-xs text-slate-400 mt-1">{exerciseHistory.sessions_count} sessions logged</div>
                  </div>
                  {exerciseHistory.current_pr && (
                    <div className="text-right">
                      <div className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                        <Trophy className="w-3 h-3" /> Current PR
                      </div>
                      <div className="text-2xl font-black text-amber-400 font-heading">
                        {exerciseHistory.current_pr.weight_kg} kg
                      </div>
                      <div className="text-xs text-slate-400">× {exerciseHistory.current_pr.reps} reps</div>
                    </div>
                  )}
                </div>

                {/* Progression Chart */}
                {exerciseHistory.progression_points.length > 0 && (
                  <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
                    <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Weight Progression
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={exerciseHistory.progression_points}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#182032" />
                          <XAxis dataKey="date_label" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}kg`} />
                          <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} kg`, 'Weight']} />
                          <Line
                            type="monotone"
                            dataKey="weight_kg"
                            stroke="#10B981"
                            strokeWidth={2.5}
                            dot={(props: any) => {
                              const isPr = props.payload?.is_pr;
                              return <circle
                                key={props.key}
                                cx={props.cx}
                                cy={props.cy}
                                r={isPr ? 6 : 4}
                                fill={isPr ? '#F59E0B' : '#10B981'}
                                stroke={isPr ? '#fff' : '#10B981'}
                                strokeWidth={isPr ? 2 : 0}
                              />;
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> = New PR
                      </span>
                    </p>
                  </div>
                )}

                {/* Session History Table */}
                {exerciseHistory.sessions.length > 0 && (
                  <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 overflow-x-auto">
                    <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      Session History
                    </h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-wider border-b border-white/5">
                          <th className="pb-2 text-left">Date</th>
                          <th className="pb-2 text-center">Sets</th>
                          <th className="pb-2 text-center">Best Weight</th>
                          <th className="pb-2 text-center">Best Reps</th>
                          <th className="pb-2 text-center">Volume</th>
                          <th className="pb-2 text-center">PR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {exerciseHistory.sessions.map((session) => (
                          <tr key={session.log_id} className={session.is_pr ? 'bg-amber-500/5' : ''}>
                            <td className="py-2 text-slate-300 font-medium">{session.date_label}</td>
                            <td className="py-2 text-center text-slate-400">{session.sets_count}</td>
                            <td className="py-2 text-center text-white font-bold">{session.best_weight_kg} kg</td>
                            <td className="py-2 text-center text-slate-300">{session.best_reps}</td>
                            <td className="py-2 text-center text-violet-400 font-semibold">{session.total_volume_kg.toFixed(0)} kg</td>
                            <td className="py-2 text-center">
                              {session.is_pr && <Award className="w-4 h-4 text-amber-400 mx-auto" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WORKOUT HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                Workout History
              </h3>

              {historyLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              ) : workoutLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No workouts logged yet. Your history will appear here after completing sessions.
                </p>
              ) : (
                <div className="space-y-3">
                  {workoutLogs.map((log: WorkoutLog) => {
                    const isExpanded = expandedLogId === log.id;
                    const completedSets = log.sets.filter(s => s.is_completed);
                    const exerciseNames = [...new Set(completedSets.map(s => s.exercise_name))];
                    return (
                      <div
                        key={log.id}
                        className="rounded-xl bg-dark-900 border border-white/5 overflow-hidden transition"
                      >
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-850/60 transition"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${
                              log.day_type === 'REST' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              D{log.day_order_completed}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{log.day_name}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-dark-800">
                                  {log.day_type}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                <span>{new Date(log.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {log.duration_seconds > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {Math.round(log.duration_seconds / 60)} min
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 text-right">
                            <div>
                              {log.total_volume_kg > 0 && (
                                <div className="text-xs font-bold text-violet-400">{log.total_volume_kg.toFixed(0)} kg</div>
                              )}
                              <div className="text-[11px] text-slate-500">{log.exercises_completed_count} exercises</div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-white/5 bg-dark-950/40 space-y-3 animate-fade-in">
                            {log.notes && (
                              <p className="text-xs text-slate-300 italic">"{log.notes}"</p>
                            )}
                            {log.sets && log.sets.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-white/5">
                                      <th className="pb-1.5">Exercise</th>
                                      <th className="pb-1.5 text-center">Set</th>
                                      <th className="pb-1.5 text-center">Target</th>
                                      <th className="pb-1.5 text-center">Actual</th>
                                      <th className="pb-1.5 text-center">RPE</th>
                                      <th className="pb-1.5 text-center">Vol.</th>
                                      <th className="pb-1.5 text-center">✓</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5 text-slate-300">
                                    {log.sets.map((s) => (
                                      <tr key={s.id} className={!s.is_completed ? 'opacity-40' : ''}>
                                        <td className="py-1.5 font-medium text-white">{s.exercise_name}</td>
                                        <td className="py-1.5 text-center text-slate-400">#{s.set_number}</td>
                                        <td className="py-1.5 text-center text-slate-500">
                                          {s.target_weight_kg ? `${s.target_weight_kg}kg×${s.target_reps}` : '—'}
                                        </td>
                                        <td className="py-1.5 text-center font-semibold text-white">
                                          {s.actual_weight_kg}kg × {s.actual_reps}
                                        </td>
                                        <td className="py-1.5 text-center text-amber-400/70">
                                          {s.rpe ? s.rpe : '—'}
                                        </td>
                                        <td className="py-1.5 text-center text-violet-400/70">
                                          {s.is_completed && s.actual_weight_kg > 0 && s.actual_reps > 0
                                            ? `${(s.actual_weight_kg * s.actual_reps).toFixed(0)}`
                                            : '—'}
                                        </td>
                                        <td className="py-1.5 text-center">
                                          {s.is_completed
                                            ? <CheckCircle className="w-3 h-3 text-emerald-500 mx-auto" />
                                            : <span className="text-slate-600">✗</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
