import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  Target,
  Filter,
  Check
} from 'lucide-react';
import api from '../../api/client';
import { Exercise } from '../../types';

export const ExercisesPage: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Chest');
  const [equipment, setEquipment] = useState('Barbell');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [instructions, setInstructions] = useState('');
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState(10);
  const [restSeconds, setRestSeconds] = useState(60);
  const [saving, setSaving] = useState(false);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const res = await api.get<Exercise[]>('/admin/exercises');
      setExercises(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const muscleGroups = ['ALL', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];

  const handleOpenAdd = () => {
    setEditingExercise(null);
    setName('');
    setMuscleGroup('Chest');
    setEquipment('Barbell');
    setDifficulty('Intermediate');
    setInstructions('');
    setDefaultSets(3);
    setDefaultReps(10);
    setRestSeconds(60);
    setShowModal(true);
  };

  const handleOpenEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setName(ex.name);
    setMuscleGroup(ex.muscle_group);
    setEquipment(ex.equipment);
    setDifficulty(ex.difficulty);
    setInstructions(ex.instructions || '');
    setDefaultSets(ex.default_sets);
    setDefaultReps(ex.default_reps);
    setRestSeconds(ex.rest_seconds);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deactivate this exercise from the library?')) return;
    try {
      await api.delete(`/admin/exercises/${id}`);
      await fetchExercises();
    } catch (err) {
      alert('Failed to delete exercise');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        muscle_group: muscleGroup,
        equipment,
        difficulty,
        instructions,
        default_sets: Number(defaultSets),
        default_reps: Number(defaultReps),
        rest_seconds: Number(restSeconds),
        is_active: true,
      };

      if (editingExercise) {
        await api.put(`/admin/exercises/${editingExercise.id}`, payload);
      } else {
        await api.post('/admin/exercises', payload);
      }

      setShowModal(false);
      await fetchExercises();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save exercise');
    } finally {
      setSaving(false);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle =
      selectedMuscle === 'ALL' ||
      ex.muscle_group.toLowerCase() === selectedMuscle.toLowerCase();
    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="py-4 px-4 md:px-8 border-b border-white/5 bg-dark-950/80 backdrop-blur-md sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-heading">
            Master Exercise Library
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Maintain the central exercise database reused across all workout routines
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-glow-brand self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exercise</span>
        </button>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
        {/* Search & Muscle Filters */}
        <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercise by name or equipment..."
              className="w-full pl-10 pr-4 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Muscle Group Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {muscleGroups.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMuscle(m)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedMuscle === m
                    ? 'bg-emerald-500 text-black shadow-glow-brand font-bold'
                    : 'bg-dark-900 text-slate-400 hover:text-white hover:bg-dark-800 border border-white/5'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 py-12 text-center text-slate-400">
              Loading exercise database...
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="col-span-3 glass-card rounded-2xl p-8 text-center border border-white/10">
              <Dumbbell className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Exercises Match</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try a different muscle group or search keyword.
              </p>
            </div>
          ) : (
            filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {ex.muscle_group}
                    </span>
                    <span className="text-xs text-slate-400">{ex.equipment}</span>
                  </div>

                  <h3 className="text-base font-bold text-white font-heading">{ex.name}</h3>

                  {ex.instructions && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {ex.instructions}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Target className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {ex.default_sets} × {ex.default_reps}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ex.rest_seconds}s</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(ex)}
                      className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white transition"
                      title="Edit Exercise"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title="Delete Exercise"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* CREATE / EDIT EXERCISE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-850 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-card-dark space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold font-heading">
                {editingExercise ? 'Edit Exercise' : 'Add Master Exercise'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Romanian Deadlift"
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Muscle Group
                  </label>
                  <select
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {muscleGroups.filter((m) => m !== 'ALL').map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Equipment
                  </label>
                  <select
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Barbell">Barbell</option>
                    <option value="Dumbbell">Dumbbell</option>
                    <option value="Cable">Cable</option>
                    <option value="Machine">Machine</option>
                    <option value="Bodyweight">Bodyweight</option>
                    <option value="Cardio">Cardio Equipment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Sets</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Reps</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultReps}
                    onChange={(e) => setDefaultReps(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Rest (s)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-1.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Form Cues & Instructions
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Key form tips, range of motion, and breathing cues..."
                  className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-glow-brand disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
