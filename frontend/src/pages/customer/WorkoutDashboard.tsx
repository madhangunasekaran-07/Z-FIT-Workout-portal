import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Dumbbell,
  Clock,
  Calendar,
  Flame,
  CheckCircle2,
  ArrowRight,
  Coffee,
  Sparkles,
  Trophy,
  AlertTriangle,
  RotateCw,
  Target,
  Zap,
  BarChart3,
  Award,
  TrendingUp,
} from 'lucide-react';
import { Header } from '../../components/common/Header';
import { CurrentWorkout, ProgressStats } from '../../types';
import api from '../../api/client';
import confetti from 'canvas-confetti';

interface OutletContextType {
  onOpenRestTimer: (seconds?: number) => void;
  workoutData: CurrentWorkout | null;
  refreshWorkout: () => Promise<void>;
}

export const WorkoutDashboard: React.FC = () => {
  const { onOpenRestTimer, refreshWorkout } = useOutletContext<OutletContextType>();
  const [workout, setWorkout] = useState<CurrentWorkout | null>(null);
  const [progress, setProgress] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancingRest, setAdvancingRest] = useState(false);
  const navigate = useNavigate();

  const fetchWorkout = async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        api.get<CurrentWorkout>('/workouts/current'),
        api.get<ProgressStats>('/progress').catch(() => null),
      ]);
      setWorkout(wRes.data);
      if (pRes) setProgress(pRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkout();
  }, []);

  const handleContinueRestDay = async () => {
    setAdvancingRest(true);
    try {
      await api.post('/workouts/advance-rest');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      await fetchWorkout();
      await refreshWorkout();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to advance rest day');
    } finally {
      setAdvancingRest(false);
    }
  };

  const getDayTypeBadgeColor = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'PUSH':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'PULL':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'LEGS':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'REST':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  const progressPercent = workout && workout.total_program_days > 0
    ? Math.min(Math.round((workout.completed_days_count / workout.total_program_days) * 100), 100)
    : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        onOpenRestTimer={() => onOpenRestTimer(60)}
        daysRemaining={workout?.days_remaining}
        dueDate={workout?.due_date}
        statusTag={workout?.assignment_status}
        currentStreak={workout?.current_streak}
      />

      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Fetching scheduled workout sequence...</p>
          </div>
        ) : !workout?.has_assignment || workout?.is_program_completed || workout?.assignment_status === 'COMPLETED' ? (
          /* Empty or Completed state */
          <div className="glass-card rounded-2xl p-8 md:p-12 text-center border border-white/10 max-w-xl mx-auto my-12 relative overflow-hidden">
            {workout?.is_program_completed || workout?.assignment_status === 'COMPLETED' ? (
              <>
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                  <Trophy className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Program Completed
                </div>
                <h3 className="text-2xl font-black text-white font-heading">
                  Congratulations!
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-md mx-auto">
                  {workout?.notes || `You have completed all ${workout?.total_program_days || 0} scheduled days of ${workout?.program_name || 'your program'}!`}
                </p>
                <div className="mt-4 text-xs text-slate-400">
                  Review your progression in <span className="text-emerald-400 font-semibold cursor-pointer underline" onClick={() => navigate('/progress')}>Progress Analytics</span> or contact your coach for your next split.
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => navigate('/progress')}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-glow-brand"
                  >
                    <span>View Progress &amp; PRs</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={fetchWorkout}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 text-xs font-semibold border border-white/10 transition"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Dumbbell className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white font-heading">
                  No Workout Assigned
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  {workout?.notes || 'Your administrator or coach has not assigned an active workout program to your account yet.'}
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={fetchWorkout}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 text-sm font-semibold transition"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Check Updates</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : workout.is_rest_day ? (
          /* REST DAY VIEW (Section 8) */
          <div className="glass-card rounded-3xl p-6 sm:p-10 border border-blue-500/20 relative overflow-hidden shadow-card-dark">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center space-x-2.5 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Coffee className="w-4 h-4" />
              <span>Day {workout.day_order} • Scheduled Recovery</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-heading mb-2">
              REST DAY
            </h2>
            <p className="text-lg text-slate-300 font-medium max-w-xl">
              Recovery is part of the program.
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-lg leading-relaxed">
              Muscles repair and grow during rest periods. Prioritize hydration, sleep, protein intake, and mobility today.
            </p>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Ready to resume training tomorrow? Tap continue when your rest period finishes.
              </div>
              <button
                id="continue-rest-btn"
                onClick={handleContinueRestDay}
                disabled={advancingRest}
                className="py-3.5 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-blue-500 to-cyan-400 text-black hover:from-blue-400 hover:to-cyan-300 transition shadow-glow-cyan flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {advancingRest ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>CONTINUE TO NEXT WORKOUT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE SCHEDULED WORKOUT VIEW (Section 5) */
          <div className="space-y-6">
            {/* Primary Hero Workout Card */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-emerald-500/20 relative overflow-hidden shadow-card-dark">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    PROGRAM
                  </span>
                  <span className="text-xs font-bold text-white px-2.5 py-0.5 rounded-full bg-dark-800 border border-white/10">
                    {workout.program_name}
                  </span>
                  {workout.level_name && (
                    <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      {workout.level_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${getDayTypeBadgeColor(workout.day_type)}`}>
                    {workout.day_type || 'WORKOUT'}
                  </span>
                </div>
              </div>

              {/* Day title & Workout Name */}
              <div className="mb-6">
                <div className="text-sm font-bold uppercase tracking-widest text-emerald-400">
                  CURRENT WORKOUT
                </div>
                <div className="text-3xl sm:text-5xl font-black tracking-tight text-white font-heading mt-1">
                  Day {workout.day_order} • {workout.day_name}
                </div>
                {workout.notes && (
                  <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                    {workout.notes}
                  </p>
                )}
              </div>

              {/* Quick Workout Specs */}
              <div className="flex flex-wrap items-center gap-6 py-4 border-y border-white/10 text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <Dumbbell className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">{workout.exercises?.length || 0}</span>
                  <span className="text-slate-400">Exercises</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-white">~{workout.estimated_duration_minutes || 55}</span>
                  <span className="text-slate-400">min</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">
                    {workout.exercises?.reduce((acc, ex) => acc + (ex.target_sets || 3), 0) || 0}
                  </span>
                  <span className="text-slate-400">Total Sets</span>
                </div>
              </div>

              {/* Start Workout Action */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  Progression advances automatically only after you log and complete your sets.
                </div>
                <button
                  id="start-workout-btn"
                  onClick={() => navigate('/workout/active')}
                  className="py-3.5 px-8 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 transition shadow-glow-brand flex items-center justify-center space-x-2.5 transform active:scale-95"
                >
                  <Dumbbell className="w-5 h-5 font-black" />
                  <span>START WORKOUT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Exercise Preview List */}
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                Today's Exercise Routine
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workout.exercises?.map((ex, idx) => (
                  <div
                    key={ex.exercise_id || idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-dark-900 border border-white/5 hover:border-white/10 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{ex.name}</div>
                        <div className="text-xs text-slate-400">
                          {ex.target_sets} sets × {ex.target_reps} reps • {ex.equipment}
                        </div>
                      </div>
                    </div>
                    {ex.previous_best_weight ? (
                      <div className="text-right">
                        <span className="text-[10px] text-amber-400 font-bold uppercase">PR</span>
                        <div className="text-xs font-bold text-slate-200">{ex.previous_best_weight} kg</div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Target</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Secondary Metric Cards Grid (Progress, Streak, Volume, Due Date) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Program Progress Card */}
              <div className="glass-card rounded-2xl p-5 border border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Program Progress
                </span>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-black font-heading text-white">
                    {workout.completed_days_count}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">
                    / {workout.total_program_days} Workouts
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-dark-900 rounded-full h-2 mt-3 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 text-right mt-1.5 font-medium">
                  {progressPercent}% completed
                </div>
              </div>

              {/* Streak Card */}
              <div className="glass-card rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Workout Streak</span>
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black font-heading text-amber-400">
                    {progress?.current_streak ?? workout.current_streak}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">Days</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-3 font-medium">
                  Longest: <strong className="text-white font-bold">{progress?.longest_streak ?? workout.current_streak} days</strong>
                </div>
              </div>

              {/* Total Training Volume */}
              <div className="glass-card rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Total Volume</span>
                  <Zap className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-2xl sm:text-3xl font-black font-heading text-violet-400">
                    {(progress?.total_training_volume_kg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">kg</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-3 font-medium">
                  This week: <strong className="text-emerald-400">{progress?.workouts_this_week || 0} sessions</strong>
                </div>
              </div>

              {/* Due Date & Days Remaining */}
              <div className="glass-card rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Schedule Pace</span>
                  <Calendar className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span
                    className={`text-3xl font-black font-heading ${
                      workout.days_remaining !== undefined && workout.days_remaining <= 5
                        ? 'text-amber-400'
                        : 'text-white'
                    }`}
                  >
                    {workout.days_remaining !== undefined ? Math.max(0, workout.days_remaining) : 0}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">days left</span>
                </div>
                <div className="mt-2.5">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      workout.assignment_status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : workout.assignment_status === 'DUE_SOON'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}
                  >
                    {workout.assignment_status || 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Section: PR Highlights & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Records Highlight Card */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Personal Records Highlight</span>
                  </h3>
                  <button
                    onClick={() => navigate('/progress')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <span>Full Analytics</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {progress?.personal_records && progress.personal_records.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {progress.personal_records.slice(0, 4).map((pr) => (
                      <div
                        key={pr.id}
                        className="p-3 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{pr.exercise_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{pr.reps} reps</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-amber-400">{pr.weight_kg} kg</div>
                          {pr.estimated_1rm && (
                            <div className="text-[9px] text-slate-500">~{pr.estimated_1rm.toFixed(0)} 1RM</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Complete your first workout to establish personal records.
                  </div>
                )}
              </div>

              {/* Recent Workout Activity Card */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span>Recent Workout Activity</span>
                  </h3>
                  <button
                    onClick={() => navigate('/progress')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    <span>History</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {progress?.recent_history && progress.recent_history.length > 0 ? (
                  <div className="space-y-2">
                    {progress.recent_history.slice(0, 3).map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                            log.day_type === 'REST' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            D{log.day_order_completed}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{log.day_name}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(log.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {log.duration_seconds > 0 ? ` • ${Math.round(log.duration_seconds / 60)} min` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {log.total_volume_kg > 0 && (
                            <div className="text-xs font-bold text-violet-400">
                              {log.total_volume_kg.toFixed(0)} kg
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500">
                            {log.exercises_completed_count} exercises
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No workout sessions recorded yet. Start today's workout above!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
