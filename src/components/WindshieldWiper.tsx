import React from 'react';
import { JourneySpeed } from '../types';

interface WindshieldWiperProps {
  isVisible: boolean;
  journeySpeed?: JourneySpeed;
  className?: string;
}

export const WindshieldWiper: React.FC<WindshieldWiperProps> = ({
  isVisible,
  journeySpeed = 'normal',
  className = ''
}) => {
  if (!isVisible) return null;

  const isFast = journeySpeed === 'fast';

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-35 overflow-hidden transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      aria-label="Windshield Wipers Active"
    >
      {/* Semi-transparent cleared water arc path */}
      <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <path d="M 180 600 A 380 380 0 0 1 720 220 L 720 600 Z" fill="url(#wiperClearGrad)" />
        <path d="M 520 600 A 380 380 0 0 1 980 220 L 980 600 Z" fill="url(#wiperClearGrad)" />
        <defs>
          <radialGradient id="wiperClearGrad" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Driver Side Wiper Blade (Left) */}
      <div className="absolute bottom-0 left-[30%] sm:left-[35%] w-0 h-0 flex items-end justify-center">
        <div
          className={`relative w-3.5 h-[62vh] max-h-[520px] bg-gradient-to-t from-stone-950 via-stone-900 to-stone-800 rounded-t-full shadow-[0_10px_25px_rgba(0,0,0,0.8)] border-x border-stone-800 ${
            isFast ? 'animate-wiper-left-fast' : 'animate-wiper-left'
          }`}
        >
          {/* Main Metallic Arm Shaft */}
          <div className="absolute inset-x-1 top-4 bottom-24 bg-stone-700/80 rounded-full border-t border-stone-500" />
          {/* Arm Hinge Joint */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-5 h-7 bg-stone-950 rounded-md border border-stone-700 shadow-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-amber-600/80 shadow-inner" />
          </div>
          {/* Wiper Blade Base Mounting Cap */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-8 bg-stone-950 rounded-b-xl border-t-2 border-amber-600/90 shadow-2xl" />
          {/* Rubber Squeegee Blade Attachment */}
          <div className="absolute top-0 -left-1 w-1.5 h-[92%] bg-slate-950 border-r border-cyan-400/30 rounded-l-sm" />
          {/* Water Squeegee Spray Micro-glow */}
          <div className="absolute top-2 -left-2 w-2 h-24 bg-sky-300/20 rounded-full blur-sm" />
        </div>
      </div>

      {/* Passenger Side Wiper Blade (Right) */}
      <div className="absolute bottom-0 left-[62%] sm:left-[65%] w-0 h-0 flex items-end justify-center">
        <div
          className={`relative w-3.5 h-[62vh] max-h-[520px] bg-gradient-to-t from-stone-950 via-stone-900 to-stone-800 rounded-t-full shadow-[0_10px_25px_rgba(0,0,0,0.8)] border-x border-stone-800 ${
            isFast ? 'animate-wiper-right-fast' : 'animate-wiper-right'
          }`}
        >
          {/* Main Metallic Arm Shaft */}
          <div className="absolute inset-x-1 top-4 bottom-24 bg-stone-700/80 rounded-full border-t border-stone-500" />
          {/* Arm Hinge Joint */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-5 h-7 bg-stone-950 rounded-md border border-stone-700 shadow-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-amber-600/80 shadow-inner" />
          </div>
          {/* Wiper Blade Base Mounting Cap */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-8 bg-stone-950 rounded-b-xl border-t-2 border-amber-600/90 shadow-2xl" />
          {/* Rubber Squeegee Blade Attachment */}
          <div className="absolute top-0 -left-1 w-1.5 h-[92%] bg-slate-950 border-r border-cyan-400/30 rounded-l-sm" />
          {/* Water Squeegee Spray Micro-glow */}
          <div className="absolute top-2 -left-2 w-2 h-24 bg-sky-300/20 rounded-full blur-sm" />
        </div>
      </div>
    </div>
  );
};
