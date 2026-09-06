import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { BottomNav } from '../components/common/BottomNav';
import { RestTimer } from '../components/common/RestTimer';
import api from '../api/client';
import { CurrentWorkout } from '../types';

export const CustomerLayout: React.FC = () => {
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(60);
  const [workoutData, setWorkoutData] = useState<CurrentWorkout | null>(null);

  const fetchCurrentWorkoutInfo = async () => {
    try {
      const res = await api.get<CurrentWorkout>('/workouts/current');
      setWorkoutData(res.data);
    } catch (err) {
      // Ignore background error
    }
  };

  useEffect(() => {
    fetchCurrentWorkoutInfo();
  }, []);

  const handleOpenRestTimer = (seconds: number = 60) => {
    setRestTimerSeconds(seconds);
    setIsRestTimerOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-dark-950 text-slate-100">
      {/* Sidebar for desktop */}
      <Sidebar
        currentProgramName={workoutData?.program_name || 'Intermediate PPL'}
        currentStreak={workoutData?.current_streak || 0}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Outlet
          context={{
            onOpenRestTimer: handleOpenRestTimer,
            workoutData,
            refreshWorkout: fetchCurrentWorkoutInfo,
          }}
        />
      </div>

      {/* Floating Rest Timer */}
      <RestTimer
        isOpen={isRestTimerOpen}
        initialSeconds={restTimerSeconds}
        onClose={() => setIsRestTimerOpen(false)}
      />

      {/* Bottom Nav for mobile */}
      <BottomNav />
    </div>
  );
};
