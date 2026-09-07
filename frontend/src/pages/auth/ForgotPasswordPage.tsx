import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, Mail, AlertCircle, ArrowLeft, CheckCircle2, KeyRound, ExternalLink } from 'lucide-react';
import api from '../../api/client';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'If an account exists, password reset instructions have been generated.');
      setSubmitted(true);
      if (res.data.dev_reset_url) {
        setDevResetUrl(res.data.dev_reset_url);
      }
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      const msg = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail)
        ? errDetail[0]?.msg || 'Validation error'
        : 'Failed to request password reset. Please try again.';
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
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-glow-brand mb-4">
          <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-heading">
          Reset <span className="text-emerald-400">Password</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter your registered email to request a secure password reset
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 z-10">
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card-dark">
          {error && (
            <div className="mb-5 flex items-center space-x-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm p-3.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted && message && (
            <div className="mb-5 space-y-4">
              <div className="flex items-start space-x-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm p-3.5 rounded-xl">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-300">Request Sent</p>
                  <p className="text-slate-300 text-xs">{message}</p>
                </div>
              </div>

              {/* Development helper banner */}
              {devResetUrl && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <span>⚡ Development Test Access</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Local environment detected. You can jump directly to the password reset page:
                  </p>
                  <button
                    onClick={() => navigate(devResetUrl)}
                    className="w-full py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2"
                  >
                    <span>Proceed to Password Reset</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {!submitted ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="athlete@zfit.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  For privacy, we never disclose whether an email is registered.
                </p>
              </div>

              <button
                id="forgot-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 transition shadow-glow-brand flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>SEND RESET INSTRUCTIONS</span>
                )}
              </button>
            </form>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                  setDevResetUrl(null);
                }}
                className="w-full py-2.5 px-3 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Request for another email
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
