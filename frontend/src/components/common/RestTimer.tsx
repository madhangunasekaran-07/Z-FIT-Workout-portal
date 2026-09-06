import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Volume2 } from 'lucide-react';

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({ initialSeconds = 60, isOpen, onClose }) => {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTotalSeconds(initialSeconds);
    setSecondsLeft(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds, isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      // Optional browser chime sound if supported
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
        osc.stop(audioCtx.currentTime + 0.8);
      } catch (e) {
        // audio context not allowed without interaction
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  if (!isOpen) return null;

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const remainderSeconds = secondsLeft % 60;

  const setPreset = (secs: number) => {
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsRunning(true);
  };

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 animate-fade-in">
      <div className="bg-dark-850/95 border border-emerald-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-glow-brand w-72 text-white">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Timer className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase">Rest Timer</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Countdown Display */}
        <div className="text-center my-3">
          <div className="text-4xl font-black tracking-tight font-heading text-white">
            {String(minutes).padStart(2, '0')}:{String(remainderSeconds).padStart(2, '0')}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {secondsLeft === 0 ? 'Rest complete! Hit your next set.' : 'Breathe and recover'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-dark-900 rounded-full h-2 mb-3 overflow-hidden border border-white/5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3 mb-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition shadow-lg ${
              isRunning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-glow-brand'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => {
              setSecondsLeft(totalSeconds);
              setIsRunning(true);
            }}
            className="p-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-200 transition"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Preset quick buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10 text-xs">
          {[30, 60, 90, 120].map((s) => (
            <button
              key={s}
              onClick={() => setPreset(s)}
              className={`py-1 rounded-lg text-center font-medium transition ${
                totalSeconds === s
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-dark-700/60 text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
