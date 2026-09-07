import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export const AdminSettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await api.put('/auth/profile', { full_name: fullName });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      const msg = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail)
        ? errDetail[0]?.msg || 'Validation error'
        : 'Failed to update admin profile';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      setPasswordLoading(false);
      return;
    }

    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      const msg = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail)
        ? errDetail[0]?.msg || 'Validation error'
        : 'Failed to update administrator password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Settings & Security"
        subtitle="Manage administrator profile details, security credentials, and access keys"
      />

      <main className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
        {/* Administrator Status Card */}
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-glow-brand flex-shrink-0">
            <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-white font-heading">{user?.full_name}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                SYSTEM ADMINISTRATOR
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{user?.email}</p>
            <p className="text-xs text-slate-500 mt-2">
              Full administrative privileges over master exercises, programs, customer accounts, and progression.
            </p>
          </div>
        </div>

        {/* Admin Personal Information */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Administrator Information</span>
          </div>

          {profileSuccess && (
            <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Administrator profile updated successfully!</span>
            </div>
          )}

          {profileError && (
            <div className="flex items-center space-x-2 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 bg-dark-900/50 border border-white/5 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-black transition shadow-glow-brand flex items-center space-x-2 disabled:opacity-50"
              >
                {profileSaving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE DETAILS</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Administrator Password</span>
          </div>

          {passwordSuccess && (
            <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Admin password updated successfully!</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center space-x-2 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current admin password"
                className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, letter & number"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-dark-900/60 rounded-xl border border-white/5 space-y-1 text-[11px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Security Checklist
              </div>
              <div className={`flex items-center space-x-1.5 ${newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span>{newPassword.length >= 8 ? '✓' : '•'}</span>
                <span>At least 8 characters long</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${/[A-Za-z]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span>{/[A-Za-z]/.test(newPassword) ? '✓' : '•'}</span>
                <span>Contains at least one letter</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${/\d/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span>{/\d/.test(newPassword) ? '✓' : '•'}</span>
                <span>Contains at least one number</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span>{newPassword && newPassword === confirmPassword ? '✓' : '•'}</span>
                <span>Passwords match</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-black transition shadow-glow-brand flex items-center space-x-2 disabled:opacity-50"
              >
                {passwordLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>UPDATE ADMIN PASSWORD</span>
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
