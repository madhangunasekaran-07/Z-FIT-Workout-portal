import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Copy,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Dumbbell,
  Coffee,
  Check,
  X,
  Clock,
  RotateCw,
  Search
} from 'lucide-react';
import api from '../../api/client';
import { Program, ProgramDay, ProgramExercise, Level, Exercise } from '../../types';

export const ProgramsPage: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [masterExercises, setMasterExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Split builder editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programLevelId, setProgramLevelId] = useState<number | ''>('');
  const [splitDays, setSplitDays] = useState<ProgramDay[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, lRes, eRes] = await Promise.all([
        api.get<Program[]>('/admin/programs'),
        api.get<Level[]>('/admin/levels'),
        api.get<Exercise[]>('/admin/exercises'),
      ]);
      setPrograms(pRes.data);
      setLevels(lRes.data);
      setMasterExercises(eRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleOpenCreateNew = () => {
    setEditingProgramId(null);
    setProgramName('');
    setProgramDescription('');
    setProgramLevelId(levels[0]?.id || '');
    // Default 4-day template
    setSplitDays([
      {
        day_order: 1,
        name: 'Day 1 - Push',
        day_type: 'PUSH',
        is_rest_day: false,
        estimated_duration_minutes: 55,
        exercises: [],
      },
      {
        day_order: 2,
        name: 'Day 2 - Pull',
        day_type: 'PULL',
        is_rest_day: false,
        estimated_duration_minutes: 55,
        exercises: [],
      },
      {
        day_order: 3,
        name: 'Day 3 - Legs',
        day_type: 'LEGS',
        is_rest_day: false,
        estimated_duration_minutes: 60,
        exercises: [],
      },
      {
        day_order: 4,
        name: 'Day 4 - Rest',
        day_type: 'REST',
        is_rest_day: true,
        estimated_duration_minutes: 0,
        exercises: [],
      },
    ]);
    setIsEditing(true);
  };

  const handleOpenEdit = async (program: Program) => {
    try {
      const res = await api.get<Program>(`/admin/programs/${program.id}`);
      const prog = res.data;
      setEditingProgramId(prog.id);
      setProgramName(prog.name);
      setProgramDescription(prog.description || '');
      setProgramLevelId(prog.level_id || '');
      setSplitDays(
        (prog.days || []).map((d) => ({
          id: d.id,
          day_order: d.day_order,
          name: d.name,
          day_type: d.day_type,
          is_rest_day: d.is_rest_day,
          estimated_duration_minutes: d.estimated_duration_minutes,
          notes: d.notes,
          exercises: (d.exercises || []).map((pe) => ({
            exercise_id: pe.exercise_id,
            exercise_order: pe.exercise_order,
            target_sets: pe.target_sets,
            target_reps: pe.target_reps,
            rest_seconds: pe.rest_seconds,
            notes: pe.notes,
            exercise: pe.exercise,
          })),
        }))
      );
      setIsEditing(true);
    } catch (err) {
      alert('Failed to load program details');
    }
  };

  const handleDuplicate = async (progId: number) => {
    try {
      await api.post(`/admin/programs/${progId}/duplicate`);
      await fetchAll();
    } catch (err) {
      alert('Failed to duplicate program');
    }
  };

  const handleDelete = async (progId: number) => {
    if (!window.confirm('Deactivate this program? Existing user history will not be corrupted.'))
      return;
    try {
      await api.delete(`/admin/programs/${progId}`);
      await fetchAll();
    } catch (err) {
      alert('Failed to deactivate program');
    }
  };

  // Split builder manipulations
  const handleAddDay = () => {
    setSplitDays((prev) => [
      ...prev,
      {
        day_order: prev.length + 1,
        name: `Day ${prev.length + 1} - Workout`,
        day_type: 'FULL_BODY',
        is_rest_day: false,
        estimated_duration_minutes: 45,
        exercises: [],
      },
    ]);
  };

  const handleRemoveDay = (dayIdx: number) => {
    setSplitDays((prev) => {
      const updated = prev.filter((_, i) => i !== dayIdx);
      return updated.map((d, i) => ({ ...d, day_order: i + 1 }));
    });
  };

  const handleMoveDay = (dayIdx: number, direction: 'UP' | 'DOWN') => {
    setSplitDays((prev) => {
      const targetIdx = direction === 'UP' ? dayIdx - 1 : dayIdx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[dayIdx];
      updated[dayIdx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated.map((d, i) => ({ ...d, day_order: i + 1 }));
    });
  };

  const handleAddExerciseToDay = (dayIdx: number, exerciseId: number) => {
    const masterEx = masterExercises.find((e) => e.id === exerciseId);
    if (!masterEx) return;

    setSplitDays((prev) => {
      const updated = [...prev];
      const day = updated[dayIdx];
      day.exercises.push({
        exercise_id: masterEx.id,
        exercise_order: day.exercises.length + 1,
        target_sets: masterEx.default_sets || 3,
        target_reps: masterEx.default_reps || 10,
        rest_seconds: masterEx.rest_seconds || 60,
        exercise: masterEx,
      });
      return updated;
    });
  };

  const handleRemoveExerciseFromDay = (dayIdx: number, exIdx: number) => {
    setSplitDays((prev) => {
      const updated = [...prev];
      updated[dayIdx].exercises.splice(exIdx, 1);
      updated[dayIdx].exercises.forEach((pe, i) => {
        pe.exercise_order = i + 1;
      });
      return updated;
    });
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName.trim()) {
      alert('Please provide a program name');
      return;
    }
    if (splitDays.length === 0) {
      alert('Please add at least one day to the workout split');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: programName,
        description: programDescription,
        level_id: programLevelId ? Number(programLevelId) : null,
        is_active: true,
        days: splitDays.map((d, i) => ({
          day_order: i + 1,
          name: d.name,
          day_type: d.day_type,
          is_rest_day: d.is_rest_day,
          estimated_duration_minutes: d.estimated_duration_minutes || 45,
          notes: d.notes,
          exercises: d.is_rest_day
            ? []
            : d.exercises.map((pe, pIdx) => ({
                exercise_id: pe.exercise_id,
                exercise_order: pIdx + 1,
                target_sets: pe.target_sets || 3,
                target_reps: pe.target_reps || 10,
                rest_seconds: pe.rest_seconds || 60,
                notes: pe.notes,
              })),
        })),
      };

      if (editingProgramId) {
        await api.put(`/admin/programs/${editingProgramId}`, payload);
      } else {
        await api.post('/admin/programs', payload);
      }

      setIsEditing(false);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save workout program split');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="py-4 px-4 md:px-8 border-b border-white/5 bg-dark-950/80 backdrop-blur-md sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-heading">
            Workout Program Splits
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Build and manage reusable sequential workout splits (PPL, Upper/Lower, 5-Day)
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={handleOpenCreateNew}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-glow-brand self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Program</span>
          </button>
        )}
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
        {isEditing ? (
          /* ==================== VISUAL SPLIT BUILDER (Section 18) ==================== */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-heading text-white">
                  {editingProgramId ? 'Edit Workout Split' : 'Visual Split Builder'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assemble workout days, reorder sequence items, toggle rest days, and attach exercises.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 rounded-xl bg-dark-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Back to List
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-6">
              {/* Program Meta Info */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Program Name
                    </label>
                    <input
                      type="text"
                      required
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      placeholder="e.g. Advanced Push Pull Legs 6-Day"
                      className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target Level
                    </label>
                    <select
                      value={programLevelId}
                      onChange={(e) => setProgramLevelId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Level</option>
                      {levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Program Overview / Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    placeholder="Brief description of the workout split frequency, target adaptation, and volume..."
                    className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Workout Days Reorderable Sequence List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
                      Sequential Split Days ({splitDays.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Workout Day</span>
                  </button>
                </div>

                {splitDays.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`glass-card rounded-2xl p-5 border transition ${
                      day.is_rest_day ? 'border-blue-500/20 bg-blue-500/5' : 'border-white/5'
                    }`}
                  >
                    {/* Day Control Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center space-x-2">
                        {/* Day order indicator */}
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                          {day.day_order}
                        </span>

                        <input
                          type="text"
                          required
                          value={day.name}
                          onChange={(e) => {
                            const updated = [...splitDays];
                            updated[dayIdx].name = e.target.value;
                            setSplitDays(updated);
                          }}
                          className="px-3 py-1.5 bg-dark-900 border border-white/10 rounded-lg text-white font-bold text-sm focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
                        />

                        {/* Day Type selector */}
                        <select
                          value={day.day_type}
                          onChange={(e) => {
                            const updated = [...splitDays];
                            updated[dayIdx].day_type = e.target.value;
                            setSplitDays(updated);
                          }}
                          className="px-2.5 py-1.5 bg-dark-900 border border-white/10 rounded-lg text-xs font-semibold text-slate-300"
                        >
                          <option value="PUSH">PUSH</option>
                          <option value="PULL">PULL</option>
                          <option value="LEGS">LEGS</option>
                          <option value="UPPER">UPPER</option>
                          <option value="LOWER">LOWER</option>
                          <option value="FULL_BODY">FULL BODY</option>
                          <option value="CARDIO">CARDIO</option>
                          <option value="REST">REST</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Rest Day Toggle */}
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={day.is_rest_day}
                            onChange={(e) => {
                              const updated = [...splitDays];
                              updated[dayIdx].is_rest_day = e.target.checked;
                              if (e.target.checked) {
                                updated[dayIdx].day_type = 'REST';
                                updated[dayIdx].name = `Day ${day.day_order} - Rest`;
                              }
                              setSplitDays(updated);
                            }}
                            className="w-4 h-4 rounded text-blue-500 focus:ring-0 bg-dark-900 border-white/20"
                          />
                          <span className="text-xs font-semibold text-blue-400">Rest Day</span>
                        </label>

                        {/* Up / Down Reorder Buttons */}
                        <div className="flex items-center space-x-1 border-l border-white/10 pl-2">
                          <button
                            type="button"
                            disabled={dayIdx === 0}
                            onClick={() => handleMoveDay(dayIdx, 'UP')}
                            className="p-1.5 rounded bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Up ↑"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={dayIdx === splitDays.length - 1}
                            onClick={() => handleMoveDay(dayIdx, 'DOWN')}
                            className="p-1.5 rounded bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Down ↓"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove Day */}
                        {splitDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(dayIdx)}
                            className="p-1.5 rounded bg-dark-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                            title="Delete Day"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Day Content */}
                    {day.is_rest_day ? (
                      <div className="py-4 text-center text-xs text-blue-400/80 flex items-center justify-center space-x-2">
                        <Coffee className="w-4 h-4" />
                        <span>Scheduled Rest & Recovery. No exercises attached.</span>
                      </div>
                    ) : (
                      <div className="pt-3 space-y-3">
                        {/* Exercises in day */}
                        {day.exercises.map((pe, peIdx) => (
                          <div
                            key={peIdx}
                            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-dark-900 border border-white/5 text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 font-bold">{peIdx + 1}.</span>
                              <span className="font-bold text-white">
                                {pe.exercise?.name || masterExercises.find((e) => e.id === pe.exercise_id)?.name || 'Exercise'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-400">Sets:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={pe.target_sets}
                                  onChange={(e) => {
                                    const updated = [...splitDays];
                                    updated[dayIdx].exercises[peIdx].target_sets =
                                      parseInt(e.target.value, 10) || 1;
                                    setSplitDays(updated);
                                  }}
                                  className="w-12 px-2 py-1 bg-dark-800 border border-white/10 rounded text-center text-white"
                                />
                              </div>

                              <div className="flex items-center space-x-1">
                                <span className="text-slate-400">Reps:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={pe.target_reps}
                                  onChange={(e) => {
                                    const updated = [...splitDays];
                                    updated[dayIdx].exercises[peIdx].target_reps =
                                      parseInt(e.target.value, 10) || 1;
                                    setSplitDays(updated);
                                  }}
                                  className="w-12 px-2 py-1 bg-dark-800 border border-white/10 rounded text-center text-white"
                                />
                              </div>

                              <div className="flex items-center space-x-1">
                                <span className="text-slate-400">Rest:</span>
                                <input
                                  type="number"
                                  min="15"
                                  step="15"
                                  value={pe.rest_seconds}
                                  onChange={(e) => {
                                    const updated = [...splitDays];
                                    updated[dayIdx].exercises[peIdx].rest_seconds =
                                      parseInt(e.target.value, 10) || 60;
                                    setSplitDays(updated);
                                  }}
                                  className="w-14 px-2 py-1 bg-dark-800 border border-white/10 rounded text-center text-white"
                                />
                                <span className="text-[10px] text-slate-500">sec</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveExerciseFromDay(dayIdx, peIdx)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Exercise Selector Dropdown */}
                        <div className="pt-1 flex items-center space-x-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddExerciseToDay(dayIdx, Number(e.target.value));
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className="px-3 py-1.5 bg-dark-900 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="" disabled>
                              + Attach Exercise from Library...
                            </option>
                            {masterExercises.map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name} ({ex.muscle_group} • {ex.equipment})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Split */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-glow-brand transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'SAVE PROGRAM SPLIT'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ==================== PROGRAMS TABLE LIST ==================== */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-3 py-12 text-center text-slate-400">
                  Loading programs...
                </div>
              ) : programs.length === 0 ? (
                <div className="col-span-3 glass-card rounded-2xl p-8 text-center border border-white/10">
                  <Layers className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-white">No Programs Created</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Click "Create New Program" to build a workout split.
                  </p>
                </div>
              ) : (
                programs.map((prog) => (
                  <div
                    key={prog.id}
                    className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {prog.level_name || 'All Levels'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {prog.days_count} Scheduled Days
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white font-heading">{prog.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {prog.description || 'Structured sequence split routine.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleDuplicate(prog.id)}
                          className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white transition text-xs flex items-center space-x-1"
                          title="Duplicate Split"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copy</span>
                        </button>
                        <button
                          onClick={() => handleDelete(prog.id)}
                          className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Program"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleOpenEdit(prog)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Split</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
