import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import api from '../../api/client';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setError('No password reset token was provided in the link.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.get('/auth/verify-reset-token', { params: { token } });
        setTokenValid(true);
        if (res.data.email) {
          setMaskedEmail(res.data.email);
        }
      } catch (err: any) {
        setTokenValid(false);
        const errDetail = err.response?.data?.detail;
        setError(typeof errDetail === 'string' ? errDetail : 'This password reset link is invalid or has expired.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Live validations
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError('Please satisfy all password security requirements below.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setResetSuccess(true);
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      const msg = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail)
        ? errDetail[0]?.msg || 'Validation error'
        : 'Failed to reset password. Please try requesting a new link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-glow-brand mb-4">
          <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-heading">
          Set New <span className="text-emerald-400">Password</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Create a secure, strong password for your Z Fit account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 z-10">
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card-dark">
          {verifying ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Verifying reset token security...</p>
            </div>
          ) : resetSuccess ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-heading">Password Updated!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your password has been changed successfully. You can now log in using your new credentials.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 transition shadow-glow-brand flex items-center justify-center space-x-2"
              >
                <span>LOG IN NOW</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : !tokenValid ? (
            <div className="space-y-5 py-2">
              <div className="flex items-start space-x-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-rose-300">Invalid or Expired Link</p>
                  <p className="text-slate-300 text-xs">{error || 'This password reset link is invalid or has expired.'}</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col space-y-2">
                <Link
                  to="/forgot-password"
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-dark-800 hover:bg-dark-700 text-emerald-400 border border-emerald-500/20 text-center transition"
                >
                  Request a New Reset Link
                </Link>
                <Link
                  to="/login"
                  className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {maskedEmail && (
                <div className="px-3.5 py-2 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Account</span>
                  <span className="text-xs font-mono font-medium text-emerald-400">{maskedEmail}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition"
                  />
                </div>
              </div>

              {/* Password Requirement Checklist */}
              <div className="p-3 bg-dark-900/60 rounded-xl border border-white/5 space-y-1.5 text-[11px]">
                <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                  Security Checklist
                </div>
                <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{hasMinLength ? '✓' : '•'}</span>
                  <span>At least 8 characters long</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${hasLetter ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{hasLetter ? '✓' : '•'}</span>
                  <span>Contains at least one letter</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{hasNumber ? '✓' : '•'}</span>
                  <span>Contains at least one number</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{passwordsMatch ? '✓' : '•'}</span>
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                id="reset-submit-btn"
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 transition shadow-glow-brand flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>RESET PASSWORD</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
