import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Calendar,
  Layers,
  Flame,
  Trophy,
  CheckCircle2,
  Shield,
  Save,
  AlertCircle
} from 'lucide-react';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { ProgressStats, CurrentWorkout } from '../../types';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [workout, setWorkout] = useState<CurrentWorkout | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wRes, pRes] = await Promise.all([
          api.get<CurrentWorkout>('/workouts/current'),
          api.get<ProgressStats>('/progress'),
        ]);
        setWorkout(wRes.data);
        setStats(pRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: any = { full_name: fullName };
      if (newPassword.trim()) {
        payload.password = newPassword;
      }
      await api.put(`/admin/customers/${user?.id}`, payload);
      await refreshUser();
      setSaveSuccess(true);
      setNewPassword('');
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Failed to update profile settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Athlete Profile"
        subtitle="Manage your personal details and view assigned training parameters"
      />

      <main className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
        {/* User Card */}
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-glow-brand flex-shrink-0">
            <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center text-2xl font-black text-emerald-400">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-white font-heading">{user?.full_name}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {user?.role}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-300">
              <div>
                Level: <span className="font-bold text-white">{user?.level_name || 'Intermediate'}</span>
              </div>
              <span>•</span>
              <div>
                Program: <span className="font-bold text-white">{workout?.program_name || 'Intermediate PPL'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Training Plan (Strictly Read-Only as per Section 12) */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Assigned Training Parameters (Managed by Coach / Admin)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/5">
              <span className="text-[11px] text-slate-400 block">Current Program</span>
              <span className="text-sm font-bold text-white truncate block mt-1">
                {workout?.program_name || 'None Assigned'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/5">
              <span className="text-[11px] text-slate-400 block">Workout Level</span>
              <span className="text-sm font-bold text-white truncate block mt-1">
                {workout?.level_name || user?.level_name || 'Standard'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/5">
              <span className="text-[11px] text-slate-400 block">Start Date</span>
              <span className="text-sm font-bold text-white truncate block mt-1">
                {workout?.start_date || 'N/A'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/5">
              <span className="text-[11px] text-slate-400 block">Due Date</span>
              <span className="text-sm font-bold text-white truncate block mt-1">
                {workout?.due_date || 'N/A'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/5 text-center">
              <span className="text-[11px] text-slate-400 block">Current Day</span>
              <span className="text-xl font-black font-heading text-emerald-400 block mt-0.5">
                Day {workout?.day_order || 1}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/5 text-center">
              <span className="text-[11px] text-slate-400 block">Finished Workouts</span>
              <span className="text-xl font-black font-heading text-white block mt-0.5">
                {stats?.completed_workouts || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/5 text-center">
              <span className="text-[11px] text-slate-400 block">Longest Streak</span>
              <span className="text-xl font-black font-heading text-amber-400 block mt-0.5">
                {stats?.longest_streak || 0}d
              </span>
            </div>
          </div>
        </div>

        {/* Personal Records Highlight */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Personal Bests</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats?.personal_records && stats.personal_records.length > 0 ? (
              stats.personal_records.map((pr) => (
                <div key={pr.id} className="p-3.5 rounded-xl bg-dark-900 border border-white/5">
                  <div className="text-xs font-semibold text-slate-400">{pr.exercise_name}</div>
                  <div className="text-2xl font-black font-heading text-amber-400 mt-1">
                    {pr.weight_kg} <span className="text-xs text-slate-400 font-normal">kg</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{pr.reps} reps</div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 col-span-3 text-center py-2">
                No personal records logged yet.
              </p>
            )}
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
          <h3 className="text-base font-bold text-white font-heading">
            Personal Account Settings
          </h3>

          {saveSuccess && (
            <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-center space-x-2 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email (Account Identifier)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 bg-dark-900/50 border border-white/5 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                New Password (leave blank to keep current)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-glow-brand flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE CHANGES</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
