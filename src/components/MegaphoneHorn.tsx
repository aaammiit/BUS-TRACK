import React, { useState } from 'react';
import { playBusHorn, getGlobalHornRhythm, setGlobalHornRhythm } from '../utils/audioSynth';
import { HornRhythm } from '../types';

interface MegaphoneHornProps {
  className?: string;
  size?: number; // size in pixels
  hornVolume?: number;
  hornRhythm?: HornRhythm;
  onHonk?: () => void;
  onToggleRhythm?: (next: HornRhythm) => void;
  showText?: boolean;
  showRhythmToggle?: boolean;
}

export const MegaphoneHorn: React.FC<MegaphoneHornProps> = ({
  className = '',
  size = 56,
  hornVolume = 0.85,
  hornRhythm,
  onHonk,
  onToggleRhythm,
  showText = true,
  showRhythmToggle = true,
}) => {
  const currentRhythm = hornRhythm || getGlobalHornRhythm();
  const [isHonking, setIsHonking] = useState(false);

  const cycleRhythm = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const order: HornRhythm[] = ['classic', 'double', 'rhythmic'];
    const curIdx = order.indexOf(currentRhythm);
    const nextRhythm = order[(curIdx + 1) % order.length];
    setGlobalHornRhythm(nextRhythm);
    if (onToggleRhythm) {
      onToggleRhythm(nextRhythm);
    }
  };

  const triggerHonk = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsHonking(true);
    playBusHorn(hornVolume, currentRhythm);
    if (onHonk) onHonk();

    const animDuration = currentRhythm === 'rhythmic' ? 1400 : currentRhythm === 'double' ? 650 : 450;
    setTimeout(() => {
      setIsHonking(false);
    }, animDuration);
  };

  const getRhythmLabel = (r: HornRhythm) => {
    switch (r) {
      case 'double':
        return { short: '2X TAP', full: 'Double Tap', icon: '⚡⚡', color: 'text-amber-300 border-amber-500/80 bg-amber-950/80' };
      case 'rhythmic':
        return { short: 'RHYTHM', full: 'Rhythmic Constant', icon: '🎶', color: 'text-emerald-300 border-emerald-500/80 bg-emerald-950/80' };
      case 'classic':
      default:
        return { short: '1X SINGLE', full: 'Classic Single Honk', icon: '🎺', color: 'text-rose-300 border-rose-500/80 bg-rose-950/80' };
    }
  };

  const rInfo = getRhythmLabel(currentRhythm);

  return (
    <div className={`group relative pointer-events-auto inline-flex items-center gap-1 select-none ${className}`}>
      {/* Soundwave Blast Glow Effect when Honking */}
      {isHonking && (
        <div className="absolute inset-0 -m-3 rounded-full bg-rose-500/25 blur-lg animate-ping pointer-events-none" />
      )}

      {/* Main Horn Button */}
      <button
        onClick={triggerHonk}
        onTouchStart={triggerHonk}
        aria-label={`Honk Bus Horn (${rInfo.full})`}
        title={`Tap to Honk (${rInfo.full})`}
        className="relative flex items-center justify-center cursor-pointer transition-transform duration-100 active:scale-90 focus:outline-none"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Megaphone Loudspeaker Vector Artwork matching uploaded reference */}
        <div className="relative flex items-center">
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform duration-150 drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] ${
              isHonking ? 'scale-110 -rotate-6' : 'hover:scale-105'
            }`}
          >
          {/* Defs for glossy RED megaphone gradients */}
          <defs>
            <linearGradient id="hornBodyGradRed" x1="20%" y1="15%" x2="80%" y2="85%">
              <stop offset="0%" stopColor="#ff4d4d" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="hornRimGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="60%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>

          {/* Sound Radiation Waves (Right side) - Radiating dynamically */}
          <g className={`transition-opacity duration-150 ${isHonking ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'}`}>
            {/* Wave 1: Top Angled */}
            <line
              x1="76"
              y1="25"
              x2="88"
              y2="10"
              stroke={isHonking ? '#fbbf24' : '#ef4444'}
              strokeWidth="4"
              strokeLinecap="round"
              className={isHonking ? 'animate-pulse' : ''}
            />
            {/* Wave 2: Upper Mid */}
            <line
              x1="81"
              y1="34"
              x2="95"
              y2="22"
              stroke={isHonking ? '#f59e0b' : '#f43f5e'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Wave 3: Center Horizontal */}
            <line
              x1="83"
              y1="49"
              x2="98"
              y2="49"
              stroke={isHonking ? '#ffffff' : '#ef4444'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Wave 4: Lower Mid */}
            <line
              x1="81"
              y1="64"
              x2="95"
              y2="76"
              stroke={isHonking ? '#f59e0b' : '#f43f5e'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Wave 5: Bottom Angled */}
            <line
              x1="76"
              y1="73"
              x2="88"
              y2="88"
              stroke={isHonking ? '#fbbf24' : '#ef4444'}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>

          {/* Handle at Bottom Left with Grip Ridges (Red & Dark Burgundy) */}
          <g>
            <path
              d="M 18 60 L 21 80 C 21 83 23 85 26 85 L 30 85 C 33 85 35 83 35 80 L 33 60 Z"
              fill="#b91c1c"
              stroke="#450a0a"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Handle Grip Slots */}
            <line x1="26" y1="68" x2="33" y2="68" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="27" y1="74" x2="34" y2="74" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="28" y1="80" x2="34" y2="80" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Rear Microphone Housing / Capsule */}
          <rect
            x="8"
            y="38"
            width="8"
            height="22"
            rx="4"
            fill="#b91c1c"
            stroke="#450a0a"
            strokeWidth="3.5"
          />

          {/* Back Cylinder Section */}
          <path
            d="M 14 31 C 14 29 16 27 18 27 L 34 27 L 34 71 L 18 71 C 16 71 14 69 14 67 Z"
            fill="url(#hornBodyGradRed)"
            stroke="#450a0a"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Large Conic Horn Flare Opening Outward to Right */}
          <path
            d="M 34 27 L 72 7 C 73 6 75 7 75 9 L 75 89 C 75 91 73 92 72 91 L 34 71 Z"
            fill="url(#hornBodyGradRed)"
            stroke="#450a0a"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* White Gloss Highlight Curve along Upper Flare */}
          <path
            d="M 37 32 Q 52 24 68 15"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />

          {/* Front Opening Rim Ring */}
          <ellipse
            cx="74"
            cy="49"
            rx="5.5"
            ry="41"
            fill="url(#hornRimGradRed)"
            stroke="#450a0a"
            strokeWidth="3.5"
          />

          {/* Front Center Emitter Dome */}
          <ellipse
            cx="75"
            cy="49"
            rx="3.5"
            ry="20"
            fill="#ef4444"
            stroke="#450a0a"
            strokeWidth="3"
          />
        </svg>
      </div>
      </button>

      {/* Label and Horn Rhythm Toggle Badge */}
      {(showText || showRhythmToggle) && (
        <div className="flex flex-col gap-0.5 select-none items-start">
          {showText && (
            <button
              onClick={triggerHonk}
              className={`font-mono font-black text-[8px] sm:text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded border transition-colors cursor-pointer active:scale-95 ${
                isHonking
                  ? 'bg-rose-500 text-white border-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.9)]'
                  : 'bg-stone-900/95 text-rose-400 border-rose-800/80 hover:border-rose-400 hover:text-rose-200'
              }`}
              title={`Honk (${rInfo.full})`}
            >
              HORN
            </button>
          )}

          {/* Rhythm Mode Toggle Button */}
          {showRhythmToggle && (
            <button
              onClick={cycleRhythm}
              onTouchStart={cycleRhythm}
              aria-label={`Horn Rhythm: ${rInfo.full}. Click to cycle.`}
              title={`Horn Rhythm: ${rInfo.full} (Click to cycle between Classic Single Honk, Double Tap, and Rhythmic Constant)`}
              className={`font-mono font-black text-[7px] sm:text-[8px] tracking-tight uppercase px-1.5 py-0.5 rounded border transition flex items-center gap-0.5 cursor-pointer shadow-sm active:scale-95 ${rInfo.color}`}
            >
              <span>{rInfo.icon}</span>
              <span>{rInfo.short}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
