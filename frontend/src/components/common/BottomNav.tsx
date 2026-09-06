import React from 'react';
import { NavLink } from 'react-router-dom';
import { Dumbbell, LineChart, MapPin, User, Activity, Users, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 px-3 py-2">
      <div className="flex items-center justify-around">
        {isAdmin ? (
          <>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Activity className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Dashboard</span>
            </NavLink>
            <NavLink
              to="/admin/customers"
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Customers</span>
            </NavLink>
            <NavLink
              to="/admin/programs"
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Layers className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Splits</span>
            </NavLink>
            <NavLink
              to="/admin/exercises"
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Dumbbell className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Exercises</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Dumbbell className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Workout</span>
            </NavLink>
            <NavLink
              to="/progress"
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <LineChart className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Progress</span>
            </NavLink>
            <NavLink
              to="/journey"
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <MapPin className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Journey</span>
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <User className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Profile</span>
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
};
