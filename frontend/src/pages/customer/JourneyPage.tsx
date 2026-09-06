import React, { useState, useEffect } from 'react';
import { Check, Dumbbell, Coffee, Clock, Sparkles, MapPin, ArrowDown } from 'lucide-react';
import { Header } from '../../components/common/Header';
import api from '../../api/client';
import { JourneyDay } from '../../types';

export const JourneyPage: React.FC = () => {
  const [journey, setJourney] = useState<JourneyDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJourney = async () => {
      try {
        const res = await api.get<JourneyDay[]>('/progress/journey');
        setJourney(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJourney();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Workout Journey"
        subtitle="Your personalized sequential training roadmap. Progression is driven purely by completion."
      />

      <main className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6 animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Mapping workout sequence roadmap...</p>
          </div>
        ) : journey.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/10 my-8">
            <MapPin className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No Program Assigned</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your workout roadmap will appear here once an administrator assigns a workout program.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 md:pl-8 space-y-6">
            {/* Vertical timeline spine */}
            <div className="absolute left-[23px] md:left-[31px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500 via-emerald-500/40 to-slate-800 pointer-events-none" />

            {journey.map((step, idx) => {
              const isCompleted = step.status === 'COMPLETED';
              const isCurrent = step.status === 'CURRENT';
              const isUpcoming = step.status === 'UPCOMING';

              return (
                <div key={step.day_order} className="relative flex items-start space-x-4 md:space-x-6 group">
                  {/* Timeline node icon */}
                  <div
                    className={`relative z-10 w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500 text-black shadow-glow-brand'
                        : isCurrent
                        ? 'bg-gradient-to-tr from-emerald-400 to-teal-300 text-black ring-4 ring-emerald-500/30 shadow-glow-brand animate-pulse'
                        : 'bg-dark-850 border border-white/10 text-slate-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : step.is_rest_day ? (
                      <Coffee className="w-4 h-4" />
                    ) : (
                      <span>{step.day_order}</span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div
                    className={`flex-1 rounded-2xl p-4 md:p-5 border transition-all ${
                      isCurrent
                        ? 'glass-card border-emerald-500/50 shadow-glow-brand bg-emerald-500/5'
                        : isCompleted
                        ? 'glass-card border-white/10 opacity-90'
                        : 'bg-dark-900/50 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-400">
                          DAY {String(step.day_order).padStart(2, '0')}
                        </span>
                        {isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-black animate-pulse">
                            CURRENT
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Completed ✓
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 flex items-center space-x-2">
                        {step.is_rest_day ? (
                          <span className="text-blue-400 font-semibold">Active Recovery</span>
                        ) : (
                          <>
                            <span>{step.exercises_count} exercises</span>
                            <span>•</span>
                            <span>~{step.duration_minutes} min</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-lg md:text-xl font-black text-white font-heading">
                      {step.day_name}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                        {step.day_type}
                      </span>
                      {step.completed_at && (
                        <span>
                          Finished on {new Date(step.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
