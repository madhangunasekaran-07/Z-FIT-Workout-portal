import React, { useState, useEffect } from 'react';
import { FlameKindling, Plus, Edit2, Trash2, X, Users, Layers } from 'lucide-react';
import api from '../../api/client';
import { Level } from '../../types';

export const LevelsPage: React.FC = () => {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const res = await api.get<Level[]>('/admin/levels');
      setLevels(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  const handleOpenAdd = () => {
    setEditingLevel(null);
    setName('');
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEdit = (lvl: Level) => {
    setEditingLevel(lvl);
    setName(lvl.name);
    setDescription(lvl.description || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this workout level?')) return;
    try {
      await api.delete(`/admin/levels/${id}`);
      await fetchLevels();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete level');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, description };
      if (editingLevel) {
        await api.put(`/admin/levels/${editingLevel.id}`, payload);
      } else {
        await api.post('/admin/levels', payload);
      }
      setShowModal(false);
      await fetchLevels();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save level');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="py-4 px-4 md:px-8 border-b border-white/5 bg-dark-950/80 backdrop-blur-md sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-heading">
            Workout Progression Levels
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Create and organize training proficiency tiers (Beginner, Intermediate, Advanced, Custom)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-glow-brand self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Level</span>
        </button>
      </header>

      <main className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 py-12 text-center text-slate-400">Loading levels...</div>
          ) : levels.length === 0 ? (
            <div className="col-span-3 glass-card rounded-2xl p-8 text-center border border-white/10">
              <FlameKindling className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Levels Defined</h3>
              <p className="text-xs text-slate-400 mt-1">
                Create levels like Beginner, Intermediate, or Advanced.
              </p>
            </div>
          ) : (
            levels.map((lvl) => (
              <div
                key={lvl.id}
                className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-3">
                    <FlameKindling className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-heading">{lvl.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                    {lvl.description || 'Tier designed for structured fitness development.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      <span>{lvl.programs_count || 0} Programs</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-cyan-400" />
                      <span>{lvl.users_count || 0} Users</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(lvl)}
                      className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(lvl.id)}
                      className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
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

      {/* CREATE / EDIT LEVEL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-850 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-card-dark space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold font-heading">
                {editingLevel ? 'Edit Level' : 'Create Workout Level'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Level Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elite Athlete"
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe target training experience, volume, and periodization focus..."
                  className="w-full px-3.5 py-2 bg-dark-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
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
                  {saving ? 'Saving...' : 'Save Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
