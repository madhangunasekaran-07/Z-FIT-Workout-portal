import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Timer,
  Plus,
  Trash2,
  Trophy,
  Check,
  Sparkles,
  Clock,
  Target,
  Zap,
  X
} from 'lucide-react';
import api from '../../api/client';
import { CurrentWorkout, SetLogInput, PRCelebration, WorkoutCompletionResponse } from '../../types';
import confetti from 'canvas-confetti';

interface OutletContextType {
  onOpenRestTimer: (seconds?: number) => void;
  refreshWorkout: () => Promise<void>;
}

interface ActiveSet {
  set_number: number;
  target_weight_kg: number;
  target_reps: number;
  actual_weight_kg: number;
  actual_reps: number;
  is_completed: boolean;
  rpe?: number | null;
  notes?: string;
}

interface ActiveExercise {
  exercise_id?: number;
  name: string;
  muscle_group?: string;
  equipment?: string;
  instructions?: string;
  rest_seconds: number;
  notes?: string;
  sets: ActiveSet[];
}

export const ActiveWorkoutPage: React.FC = () => {
  const { onOpenRestTimer, refreshWorkout } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();

  const [workout, setWorkout] = useState<CurrentWorkout | null>(null);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseSets, setCustomExerciseSets] = useState(3);
  const [customExerciseReps, setCustomExerciseReps] = useState(10);
  const [prCelebrations, setPrCelebrations] = useState<PRCelebration[]>([]);
  const [showPrModal, setShowPrModal] = useState(false);

  // Load current workout
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const res = await api.get<CurrentWorkout>('/workouts/current');
        if (!res.data.has_assignment || res.data.is_rest_day) {
          navigate('/');
          return;
        }
        setWorkout(res.data);

        // Pre-fill exercises and sets from target routine
        const initialExercises: ActiveExercise[] = (res.data.exercises || []).map((ex) => {
          const setsCount = ex.target_sets || 3;
          const defaultWeight = ex.previous_best_weight || 50;
          const setsList: ActiveSet[] = [];
          for (let s = 1; s <= setsCount; s++) {
            setsList.push({
              set_number: s,
              target_weight_kg: defaultWeight,
              target_reps: ex.target_reps || 10,
              actual_weight_kg: defaultWeight,
              actual_reps: ex.target_reps || 10,
              is_completed: false,
              rpe: null,
            });
          }
          return {
            exercise_id: ex.exercise_id,
            name: ex.name,
            muscle_group: ex.muscle_group,
            equipment: ex.equipment,
            instructions: ex.instructions,
            rest_seconds: ex.rest_seconds || 60,
            sets: setsList,
          };
        });

        setExercises(initialExercises);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrent();
  }, [navigate]);

  // Workout duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Live volume counter
  const liveVolume = exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, s) => {
      if (s.is_completed && s.actual_weight_kg > 0 && s.actual_reps > 0) {
        return setTotal + s.actual_weight_kg * s.actual_reps;
      }
      return setTotal;
    }, 0);
  }, 0);

  const handleToggleSetComplete = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const updated = prev.map((ex, eIdx) => {
        if (eIdx !== exIdx) return ex;
        const updatedSets = ex.sets.map((s, sIdx) => {
          if (sIdx !== setIdx) return s;
          return { ...s, is_completed: !s.is_completed };
        });
        return { ...ex, sets: updatedSets };
      });

      // Trigger rest timer when marking a set as complete
      const nowCompleted = !prev[exIdx].sets[setIdx].is_completed;
      if (nowCompleted) {
        onOpenRestTimer(prev[exIdx].rest_seconds);
      }

      return updated;
    });
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, field: keyof ActiveSet, val: any) => {
    setExercises((prev) =>
      prev.map((ex, eIdx) => {
        if (eIdx !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, sIdx) =>
            sIdx !== setIdx ? s : { ...s, [field]: val }
          ),
        };
      })
    );
  };

  const handleAddSet = (exIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = updated[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        set_number: ex.sets.length + 1,
        target_weight_kg: lastSet ? lastSet.actual_weight_kg : 50,
        target_reps: lastSet ? lastSet.actual_reps : 10,
        actual_weight_kg: lastSet ? lastSet.actual_weight_kg : 50,
        actual_reps: lastSet ? lastSet.actual_reps : 10,
        is_completed: false,
        rpe: null,
      });
      return updated;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      if (updated[exIdx].sets.length > 1) {
        updated[exIdx].sets.splice(setIdx, 1);
        updated[exIdx].sets.forEach((s, i) => { s.set_number = i + 1; });
      }
      return updated;
    });
  };

  const handleAddPersonalExercise = () => {
    if (!customExerciseName.trim()) return;
    const setsList: ActiveSet[] = [];
    for (let s = 1; s <= customExerciseSets; s++) {
      setsList.push({
        set_number: s,
        target_weight_kg: 20,
        target_reps: customExerciseReps,
        actual_weight_kg: 20,
        actual_reps: customExerciseReps,
        is_completed: false,
        rpe: null,
      });
    }
    setExercises((prev) => [
      ...prev,
      { name: customExerciseName, rest_seconds: 60, sets: setsList },
    ]);
    setCustomExerciseName('');
    setShowAddCustomModal(false);
  };

  const handleFinishWorkout = async () => {
    const flatSets: SetLogInput[] = [];
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        flatSets.push({
          exercise_id: ex.exercise_id,
          exercise_name: ex.name,
          set_number: s.set_number,
          target_weight_kg: s.target_weight_kg,
          target_reps: s.target_reps,
          actual_weight_kg: s.actual_weight_kg,
          actual_reps: s.actual_reps,
          is_completed: s.is_completed,
          rpe: s.rpe || null,
          notes: s.notes || null,
        });
      });
    });

    if (flatSets.length === 0) {
      alert('Please log at least one set before completing your workout.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        program_day_id: workout?.day_id,
        day_order: workout?.day_order || 1,
        duration_seconds: durationSeconds,
        notes: workoutNotes,
        sets: flatSets,
      };

      const res = await api.post<WorkoutCompletionResponse>('/workouts/complete', payload);
      const result = res.data;

      // Celebration Confetti!
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      // Show PR modal if there are new PRs
      if (result.new_prs && result.new_prs.length > 0) {
        setPrCelebrations(result.new_prs);
        setShowPrModal(true);
        // Auto-close after 8 seconds
        setTimeout(() => {
          setShowPrModal(false);
          refreshWorkout().then(() => navigate('/', { replace: true }));
        }, 8000);
      } else {
        await refreshWorkout();
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record workout completion');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const completedSetsCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.is_completed).length,
    0
  );
  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Workout</span>
        </button>

        <div className="flex items-center space-x-3">
          {/* Live Volume Counter */}
          {liveVolume > 0 && (
            <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>{liveVolume.toFixed(0)} kg</span>
            </div>
          )}
          {/* Live workout duration counter */}
          <div className="flex items-center space-x-2 bg-dark-900 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-200">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{formatTimer(durationSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Workout Title Banner */}
      <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 shadow-card-dark">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              DAY {workout?.day_order} • {workout?.program_name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-heading mt-0.5">
              {workout?.day_name}
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Sets Completed</span>
            <span className="text-lg font-black font-heading text-emerald-400">
              {completedSetsCount} / {totalSetsCount}
            </span>
            {liveVolume > 0 && (
              <span className="text-xs text-slate-500 block">
                {liveVolume.toFixed(0)} kg total volume
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Exercises & Set Tracking Cards */}
      <div className="space-y-4">
        {exercises.map((ex, exIdx) => (
          <div
            key={exIdx}
            className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 transition"
          >
            {/* Exercise Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{ex.name}</span>
                  {ex.equipment && (
                    <span className="text-[11px] font-normal text-slate-400 px-2 py-0.5 rounded-md bg-dark-800">
                      {ex.equipment}
                    </span>
                  )}
                  {ex.muscle_group && (
                    <span className="text-[11px] font-normal text-slate-500 px-2 py-0.5 rounded-md bg-dark-800">
                      {ex.muscle_group}
                    </span>
                  )}
                </h3>
                {ex.instructions && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{ex.instructions}</p>
                )}
              </div>
              {/* Rest button */}
              <button
                type="button"
                onClick={() => onOpenRestTimer(ex.rest_seconds)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-cyan-400 text-xs font-bold transition border border-cyan-500/20"
                title="Start Rest Timer"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{ex.rest_seconds}s Rest</span>
              </button>
            </div>

            {/* Set Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider border-b border-white/5">
                    <th className="pb-2 w-10 text-center">Set</th>
                    <th className="pb-2 text-slate-500 font-normal w-20">
                      <Target className="w-3 h-3 inline mr-1" />Target
                    </th>
                    <th className="pb-2 w-24">Weight (kg)</th>
                    <th className="pb-2 w-20">Reps</th>
                    <th className="pb-2 w-16">RPE</th>
                    <th className="pb-2 w-28">Notes</th>
                    <th className="pb-2 text-center w-16">Done</th>
                    <th className="pb-2 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ex.sets.map((s, setIdx) => (
                    <tr
                      key={setIdx}
                      className={`transition ${s.is_completed ? 'bg-emerald-500/5' : ''}`}
                    >
                      <td className="py-2 text-center font-bold text-slate-400">
                        {s.set_number}
                      </td>
                      {/* Target (read-only) */}
                      <td className="py-2 pr-2 text-slate-500 text-[11px]">
                        {s.target_weight_kg}kg × {s.target_reps}
                      </td>
                      {/* Actual Weight */}
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={s.actual_weight_kg}
                          onChange={(e) =>
                            handleUpdateSet(exIdx, setIdx, 'actual_weight_kg', Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-20 px-2 py-1 bg-dark-900 border border-white/10 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                        />
                      </td>
                      {/* Actual Reps */}
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          value={s.actual_reps}
                          onChange={(e) =>
                            handleUpdateSet(exIdx, setIdx, 'actual_reps', Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="w-14 px-2 py-1 bg-dark-900 border border-white/10 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                        />
                      </td>
                      {/* RPE (1-10) */}
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="10"
                          placeholder="RPE"
                          value={s.rpe || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            handleUpdateSet(exIdx, setIdx, 'rpe', val);
                          }}
                          className="w-14 px-2 py-1 bg-dark-900 border border-white/10 rounded-lg text-slate-300 font-semibold text-center focus:outline-none focus:border-amber-500/50 text-xs placeholder-slate-600"
                        />
                      </td>
                      {/* Set Notes */}
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          placeholder="Set note..."
                          value={s.notes || ''}
                          onChange={(e) => handleUpdateSet(exIdx, setIdx, 'notes', e.target.value)}
                          className="w-28 px-2 py-1 bg-dark-900 border border-white/10 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/50 text-xs placeholder-slate-600"
                        />
                      </td>
                      {/* Complete Button */}
                      <td className="py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition ${
                            s.is_completed
                              ? 'bg-emerald-500 text-black shadow-glow-brand font-bold'
                              : 'bg-dark-800 text-slate-500 hover:text-white border border-white/10'
                          }`}
                          title={s.is_completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </td>
                      {/* Remove Set */}
                      <td className="py-2 text-right">
                        {ex.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remove set"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Set Volume & Add Set */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleAddSet(exIdx)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Set</span>
              </button>
              {/* Exercise volume */}
              {(() => {
                const exVol = ex.sets.reduce((t, s) =>
                  s.is_completed && s.actual_weight_kg > 0 && s.actual_reps > 0
                    ? t + s.actual_weight_kg * s.actual_reps : t, 0);
                return exVol > 0 ? (
                  <span className="text-[11px] text-emerald-500/70 font-semibold">
                    {exVol.toFixed(0)} kg volume
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Add Personal Exercise Option */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowAddCustomModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Personal Exercise</span>
        </button>
      </div>

      {/* Workout Notes */}
      <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Workout Notes & Reflections
        </label>
        <textarea
          rows={2}
          value={workoutNotes}
          onChange={(e) => setWorkoutNotes(e.target.value)}
          placeholder="How did today's session feel? Any personal records, muscle soreness, or energy notes..."
          className="w-full p-3 bg-dark-900 border border-white/10 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Complete Workout CTA */}
      <div className="pt-2">
        <button
          id="complete-workout-btn"
          type="button"
          onClick={handleFinishWorkout}
          disabled={submitting}
          className="w-full py-4 px-6 rounded-2xl font-black text-base bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 transition shadow-glow-brand flex items-center justify-center space-x-2.5 disabled:opacity-50 transform active:scale-98"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-5 h-5 fill-black text-emerald-400" />
              <span>COMPLETE WORKOUT</span>
              {liveVolume > 0 && (
                <span className="text-xs font-semibold opacity-70">• {liveVolume.toFixed(0)} kg</span>
              )}
            </>
          )}
        </button>
        <p className="text-[11px] text-center text-slate-500 mt-2">
          Your actual sets, weights, and reps will be logged. Target planned workout data is preserved.
        </p>
      </div>

      {/* PR Celebration Modal */}
      {showPrModal && prCelebrations.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-850 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-card-dark space-y-4 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    {prCelebrations.length > 1 ? `${prCelebrations.length} New PRs!` : 'New Personal Record!'}
                  </div>
                  <h3 className="text-lg font-black font-heading text-white">Outstanding Performance!</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPrModal(false);
                  refreshWorkout().then(() => navigate('/', { replace: true }));
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {prCelebrations.map((pr, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        New {pr.exercise_name} PR
                      </div>
                      <div className="text-base font-black text-white font-heading mt-0.5">
                        {pr.exercise_name}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full">
                      {pr.pr_type === 'MAX_WEIGHT' ? '🏋️ Max Weight' : pr.pr_type === 'MAX_REPS' ? '🔢 Max Reps' : '⚡ Est. 1RM'}
                    </span>
                  </div>

                  {/* Previous vs New Record comparison */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-dark-900/80 border border-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-slate-400 font-semibold">Previous Record</div>
                      <div className="text-slate-300 font-bold mt-1 text-sm">
                        {pr.previous_weight_kg ? `${pr.previous_weight_kg} kg × ${pr.previous_reps}` : 'Baseline'}
                      </div>
                    </div>
                    <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-emerald-400 font-bold">New Record</div>
                      <div className="text-emerald-300 font-black mt-1 text-sm">
                        {pr.weight_kg} kg × {pr.reps}
                      </div>
                    </div>
                  </div>

                  {/* Date and 1RM details */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5 text-slate-400">
                    <span>
                      Date: <strong className="text-white">{new Date(pr.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                    <span>
                      Est. 1RM: <strong className="text-amber-400 font-bold">~{pr.estimated_1rm.toFixed(1)} kg</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Keep pushing forward!</span>
              </div>
              <span>Closes in 8s…</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-850 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-card-dark space-y-4 text-white">
            <h3 className="text-lg font-bold font-heading">Add Personal Exercise</h3>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">
                Exercise Name
              </label>
              <input
                type="text"
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
                placeholder="e.g., Hanging Knee Raises"
                className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Sets</label>
                <input
                  type="number"
                  value={customExerciseSets}
                  onChange={(e) => setCustomExerciseSets(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Target Reps</label>
                <input
                  type="number"
                  value={customExerciseReps}
                  onChange={(e) => setCustomExerciseReps(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="flex-1 py-2 rounded-xl bg-dark-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPersonalExercise}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-glow-brand"
              >
                Add to Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
