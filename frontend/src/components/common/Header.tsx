import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Timer, LogOut, Flame } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenRestTimer?: () => void;
  daysRemaining?: number | null;
  dueDate?: string | null;
  statusTag?: string | null;
  currentStreak?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenRestTimer,
  daysRemaining,
  dueDate,
  statusTag,
  currentStreak,
}) => {
  const { user, logout, isAdmin } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusBadge = () => {
    if (!statusTag) return null;
    switch (statusTag.toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {daysRemaining !== undefined && daysRemaining !== null
              ? `${daysRemaining} Days Left`
              : 'Active'}
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
            Due Soon ({daysRemaining}d left)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Expired
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            Completed ✓
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-4 md:px-8 border-b border-white/5 bg-dark-950/80 backdrop-blur-md sticky top-0 z-20">
      <div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-heading flex items-center gap-2">
          {title || `${getGreeting()}, ${user?.full_name?.split(' ')[0] || 'Athlete'}`}
        </h1>
        {subtitle && <p className="text-xs md:text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {/* Status Badge */}
        {getStatusBadge()}

        {/* Mobile Streak Indicator */}
        {currentStreak !== undefined && currentStreak > 0 && (
          <div className="md:hidden flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>{currentStreak}d</span>
          </div>
        )}

        {/* Quick Rest Timer toggle button */}
        {onOpenRestTimer && (
          <button
            onClick={onOpenRestTimer}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 text-xs font-bold transition"
            title="Open Rest Timer"
          >
            <Timer className="w-4 h-4" />
            <span className="hidden sm:inline">Rest Timer</span>
          </button>
        )}

        {/* Mobile logout button */}
        <button
          onClick={logout}
          className="md:hidden p-2 rounded-xl bg-dark-800 text-slate-400 hover:text-rose-400 transition"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
