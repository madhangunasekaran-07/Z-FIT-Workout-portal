import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Timer,
  Plus,
  Trash2,
  Trophy,
  Info,
  Check,
  Sparkles,
  HelpCircle,
  Clock
} from 'lucide-react';
import api from '../../api/client';
import { CurrentWorkout, WorkoutExerciseTarget, SetLogInput } from '../../types';
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

  const handleUpdateWeight = (exIdx: number, setIdx: number, val: number) => {
    setExercises((prev) =>
      prev.map((ex, eIdx) => {
        if (eIdx !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, sIdx) =>
            sIdx !== setIdx ? s : { ...s, actual_weight_kg: Math.max(0, val) }
          ),
        };
      })
    );
  };

  const handleUpdateReps = (exIdx: number, setIdx: number, val: number) => {
    setExercises((prev) =>
      prev.map((ex, eIdx) => {
        if (eIdx !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, sIdx) =>
            sIdx !== setIdx ? s : { ...s, actual_reps: Math.max(0, val) }
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
      });
      return updated;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      if (updated[exIdx].sets.length > 1) {
        updated[exIdx].sets.splice(setIdx, 1);
        // re-index
        updated[exIdx].sets.forEach((s, i) => {
          s.set_number = i + 1;
        });
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
      });
    }

    setExercises((prev) => [
      ...prev,
      {
        name: customExerciseName,
        rest_seconds: 60,
        sets: setsList,
      },
    ]);

    setCustomExerciseName('');
    setShowAddCustomModal(false);
  };

  const handleFinishWorkout = async () => {
    // Flatten sets into payload
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

      const res = await api.post('/workouts/complete', payload);

      // Celebration Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      await refreshWorkout();
      // Navigate to dashboard
      navigate('/', { replace: true });
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

        {/* Live workout duration counter */}
        <div className="flex items-center space-x-2 bg-dark-900 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-200">
          <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{formatTimer(durationSeconds)}</span>
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
          </div>
        </div>
      </div>

      {/* Exercises & Set Tracking Cards (Section 6) */}
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
                    <th className="pb-2 w-12 text-center">Set</th>
                    <th className="pb-2 w-28">Weight (kg)</th>
                    <th className="pb-2 w-24">Reps</th>
                    <th className="pb-2 text-center w-24">Status</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ex.sets.map((s, setIdx) => (
                    <tr
                      key={setIdx}
                      className={`transition ${s.is_completed ? 'bg-emerald-500/5' : ''}`}
                    >
                      <td className="py-2.5 text-center font-bold text-slate-400">
                        {s.set_number}
                      </td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="number"
                          step="0.5"
                          value={s.actual_weight_kg}
                          onChange={(e) =>
                            handleUpdateWeight(exIdx, setIdx, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2.5 py-1 bg-dark-900 border border-white/10 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="number"
                          value={s.actual_reps}
                          onChange={(e) =>
                            handleUpdateReps(exIdx, setIdx, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-16 px-2.5 py-1 bg-dark-900 border border-white/10 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 text-center">
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
                      <td className="py-2.5 text-right">
                        {ex.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remove set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Set Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAddSet(exIdx)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Set</span>
              </button>
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
            </>
          )}
        </button>
        <p className="text-[11px] text-center text-slate-500 mt-2">
          Your actual sets, weights, and reps will be logged into your history and the sequence will advance.
        </p>
      </div>

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
