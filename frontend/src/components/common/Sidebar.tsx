import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  LineChart,
  MapPin,
  User,
  Users,
  Layers,
  Activity,
  LogOut,
  Flame,
  ShieldAlert,
  FlameKindling,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentProgramName?: string;
  currentStreak?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentProgramName = 'Intermediate PPL',
  currentStreak = 0,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-dark-900 border-r border-white/5 h-screen sticky top-0 p-5 select-none z-30 justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-glow-brand">
            <Dumbbell className="w-6 h-6 text-black font-black transform -rotate-12" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight font-heading text-white">
              Z <span className="text-emerald-400">FIT</span>
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              {isAdmin ? 'Admin Console' : 'Fitness Portal'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1">
          {isAdmin ? (
            <>
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Management
              </div>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Activity className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/admin/customers"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </NavLink>
              <NavLink
                to="/admin/programs"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Layers className="w-4 h-4" />
                <span>Programs & Splits</span>
              </NavLink>
              <NavLink
                to="/admin/exercises"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Dumbbell className="w-4 h-4" />
                <span>Exercise Library</span>
              </NavLink>
              <NavLink
                to="/admin/levels"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <FlameKindling className="w-4 h-4" />
                <span>Workout Levels</span>
              </NavLink>
              <NavLink
                to="/admin/settings"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Shield className="w-4 h-4" />
                <span>Settings & Security</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Dumbbell className="w-4 h-4" />
                <span>Workout</span>
              </NavLink>
              <NavLink
                to="/progress"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <LineChart className="w-4 h-4" />
                <span>Progress</span>
              </NavLink>
              <NavLink
                to="/journey"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <MapPin className="w-4 h-4" />
                <span>Workout Journey</span>
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* Bottom info section */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        {!isAdmin && (
          <>
            {/* Active program mini card */}
            <div className="bg-dark-850 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                Assigned Program
              </span>
              <div className="text-xs font-semibold text-white truncate mt-0.5">
                {currentProgramName || 'Intermediate PPL'}
              </div>
            </div>

            {/* Streak card */}
            <div className="flex items-center space-x-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-xl">
              <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
              <div>
                <div className="text-xs font-bold text-amber-300">
                  {currentStreak} Day Streak
                </div>
                <div className="text-[10px] text-amber-300">Consistency pays off</div>
              </div>
            </div>
          </>
        )}

        {/* User profile & Logout */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">
                {user?.full_name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
