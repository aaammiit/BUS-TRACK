import React, { useState, useEffect } from 'react';
import {
  playChaiSellerSound,
  playConductorWhistleSound,
  startStationaryBusAmbientAudio,
  stopStationaryBusAmbientAudio
} from '../utils/audioSynth';

interface BusStopOverlayProps {
  isAtBusStop: boolean;
  currentStopName: string;
  onResumeJourney?: () => void;
}

/* ─────────────────────────────────────────────────────────────
   MODERN BUS STOP SHELTER SVG COMPONENT
   Matches user image: Sage canopy, dark columns, blue glass grid wall,
   horizontal slatted bench, elevated platform slab, & twin round blue signs!
   ───────────────────────────────────────────────────────────── */
export const BusStopShelterSVG: React.FC<{ stopName?: string }> = ({ stopName }) => {
  return (
    <div className="flex flex-col items-center select-none transform transition-all duration-700 hover:scale-105 drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)]">
      <svg
        viewBox="0 0 360 210"
        className="w-72 sm:w-96 md:w-[440px] h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glass Pane Background Gradient */}
          <linearGradient id="shelterGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b0d4e3" />
            <stop offset="50%" stopColor="#7cb3d1" />
            <stop offset="100%" stopColor="#4f8aa9" />
          </linearGradient>

          {/* Roof Canopy Sage Green Gradient */}
          <linearGradient id="canopyTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8da398" />
            <stop offset="100%" stopColor="#687d73" />
          </linearGradient>

          {/* Roof Underside Dark Shadow */}
          <linearGradient id="canopyUnderside" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Platform Base Gradient */}
          <linearGradient id="platformGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#869c91" />
            <stop offset="100%" stopColor="#5b6e64" />
          </linearGradient>

          {/* Blue Bus Sign Gradient */}
          <linearGradient id="busSignBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Metallic Pillar Gradient */}
          <linearGradient id="pillarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="40%" stopColor="#4b5563" />
            <stop offset="70%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Metal Pole Gradient */}
          <linearGradient id="poleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Bench Slat Gradient */}
          <linearGradient id="benchSlatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
        </defs>

        {/* 1. ELEVATED BASE CONCRETE PLATFORM */}
        <rect x="10" y="192" width="340" height="12" rx="3" fill="#0f172a" opacity="0.6" />
        <path d="M 20 184 L 340 184 L 345 192 L 15 192 Z" fill="url(#platformGrad)" />
        <rect x="15" y="192" width="330" height="8" rx="1" fill="#4d5d54" />

        {/* 2. GLASS BACK WALL WITH BLUE FRAME DIVIDER GRID */}
        <g>
          {/* Glass Pane Background */}
          <rect x="65" y="62" width="230" height="122" fill="url(#shelterGlassGrad)" stroke="#1d4ed8" strokeWidth="2.5" />

          {/* Vertical Blue Grid Frame Dividers */}
          <line x1="122.5" y1="62" x2="122.5" y2="184" stroke="#1d4ed8" strokeWidth="2.5" />
          <line x1="180" y1="62" x2="180" y2="184" stroke="#1d4ed8" strokeWidth="2.5" />
          <line x1="237.5" y1="62" x2="237.5" y2="184" stroke="#1d4ed8" strokeWidth="2.5" />

          {/* Horizontal Blue Grid Frame Dividers */}
          <line x1="65" y1="123" x2="295" y2="123" stroke="#1d4ed8" strokeWidth="2" />

          {/* Diagonal Glass Sheen Glare Highlights */}
          <path d="M 75 63 L 115 63 L 66 138 L 66 88 Z" fill="#ffffff" opacity="0.22" />
          <path d="M 135 63 L 180 63 L 100 183 L 66 183 Z" fill="#ffffff" opacity="0.18" />
          <path d="M 195 63 L 240 63 L 160 183 L 125 183 Z" fill="#ffffff" opacity="0.18" />
          <path d="M 255 63 L 294 63 L 230 183 L 195 183 Z" fill="#ffffff" opacity="0.18" />
        </g>

        {/* 3. STRUCTURAL SUPPORT COLUMNS */}
        <rect x="68" y="55" width="16" height="129" rx="2" fill="url(#pillarGrad)" />
        <rect x="276" y="55" width="16" height="129" rx="2" fill="url(#pillarGrad)" />

        {/* 4. FLAT OVERHANG ROOF / CANOPY */}
        <rect x="20" y="38" width="320" height="18" rx="2" fill="url(#canopyTopGrad)" stroke="#52635a" strokeWidth="1" />
        <rect x="20" y="56" width="320" height="8" rx="1" fill="url(#canopyUnderside)" />
        <line x1="22" y1="40" x2="338" y2="40" stroke="#b0c4ba" strokeWidth="1.5" opacity="0.6" />

        {/* STOP NAME SIGNBOARD ON CANOPY */}
        {stopName && (
          <g transform="translate(110, 24)">
            <rect x="0" y="0" width="140" height="18" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="70" y="12" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              🚏 {stopName.toUpperCase()}
            </text>
          </g>
        )}

        {/* 5. WAITING BENCH IN THE MIDDLE */}
        {/* Bench Metal Legs */}
        <rect x="108" y="156" width="8" height="28" rx="1" fill="#1f2937" />
        <rect x="124" y="156" width="8" height="28" rx="1" fill="#1f2937" />
        <rect x="228" y="156" width="8" height="28" rx="1" fill="#1f2937" />
        <rect x="244" y="156" width="8" height="28" rx="1" fill="#1f2937" />

        {/* Bench Backrest Horizontal Slats */}
        <rect x="100" y="122" width="160" height="10" rx="2" fill="url(#benchSlatGrad)" stroke="#6b7280" strokeWidth="1" />
        <rect x="100" y="136" width="160" height="10" rx="2" fill="url(#benchSlatGrad)" stroke="#6b7280" strokeWidth="1" />

        {/* Bench Seat Horizontal Slat Slab */}
        <rect x="96" y="150" width="168" height="12" rx="2" fill="#9ca3af" stroke="#4b5563" strokeWidth="1.5" />
        <rect x="96" y="150" width="168" height="4" rx="1" fill="#f1f5f9" />

        {/* 6. ROUND BLUE BUS STOP SIGNS ON LEFT & RIGHT POLES */}

        {/* --- LEFT BUS STOP SIGN --- */}
        <rect x="48" y="96" width="5" height="88" rx="1" fill="url(#poleGrad)" />
        <ellipse cx="50.5" cy="184" rx="8" ry="2" fill="#374151" opacity="0.8" />

        <circle cx="50.5" cy="88" r="22" fill="#1d4ed8" />
        <circle cx="50.5" cy="88" r="19.5" fill="#ffffff" />
        <circle cx="50.5" cy="88" r="17.5" fill="url(#busSignBlue)" />

        {/* White Bus Silhouette Icon (Left Sign) */}
        <g transform="translate(38.5, 76) scale(0.65)">
          <rect x="2" y="4" width="32" height="28" rx="5" fill="#ffffff" />
          <rect x="5" y="8" width="26" height="10" rx="2" fill="#1d4ed8" />
          <circle cx="8" cy="23" r="2.5" fill="#1d4ed8" />
          <circle cx="28" cy="23" r="2.5" fill="#1d4ed8" />
          <rect x="13" y="22" width="10" height="2" rx="1" fill="#1d4ed8" />
          <rect x="5" y="32" width="6" height="4" rx="1" fill="#1d4ed8" />
          <rect x="25" y="32" width="6" height="4" rx="1" fill="#1d4ed8" />
        </g>

        {/* --- RIGHT BUS STOP SIGN --- */}
        <rect x="306" y="96" width="5" height="88" rx="1" fill="url(#poleGrad)" />
        <ellipse cx="308.5" cy="184" rx="8" ry="2" fill="#374151" opacity="0.8" />

        <circle cx="308.5" cy="88" r="22" fill="#1d4ed8" />
        <circle cx="308.5" cy="88" r="19.5" fill="#ffffff" />
        <circle cx="308.5" cy="88" r="17.5" fill="url(#busSignBlue)" />

        {/* White Bus Silhouette Icon (Right Sign) */}
        <g transform="translate(296.5, 76) scale(0.65)">
          <rect x="2" y="4" width="32" height="28" rx="5" fill="#ffffff" />
          <rect x="5" y="8" width="26" height="10" rx="2" fill="#1d4ed8" />
          <circle cx="8" cy="23" r="2.5" fill="#1d4ed8" />
          <circle cx="28" cy="23" r="2.5" fill="#1d4ed8" />
          <rect x="13" y="22" width="10" height="2" rx="1" fill="#1d4ed8" />
          <rect x="5" y="32" width="6" height="4" rx="1" fill="#1d4ed8" />
          <rect x="25" y="32" width="6" height="4" rx="1" fill="#1d4ed8" />
        </g>
      </svg>
    </div>
  );
};

export const BusStopOverlay: React.FC<BusStopOverlayProps> = ({
  isAtBusStop,
  currentStopName,
  onResumeJourney
}) => {
  const [chaiCount, setChaiCount] = useState<number>(0);
  const [showToast, setShowToast] = useState<boolean>(false);

  // Trigger subtle, randomized ambient audio tracks (passenger chatter, conductor whistle) ONLY when stationary at a stop
  useEffect(() => {
    if (isAtBusStop) {
      startStationaryBusAmbientAudio();
    } else {
      stopStationaryBusAmbientAudio();
    }
    return () => {
      stopStationaryBusAmbientAudio();
    };
  }, [isAtBusStop]);

  if (!isAtBusStop) return null;

  const handleSipChai = () => {
    playChaiSellerSound();
    setChaiCount((prev) => prev + 1);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  return (
    <div className="absolute inset-0 z-35 pointer-events-none overflow-hidden select-none">
      {/* Soft Dimming Backdrop Overlay for Bus Halt Atmosphere */}
      <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[0.5px] transition-opacity duration-700" />

      {/* ─────────────────────────────────────────────────────────────
          1. TOP CENTER: VINTAGE BUS STOP BREAK BANNER
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-[clamp(30px,8.5vh,48px)] left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center max-w-[92vw]">
        <div className="bg-stone-950/95 border sm:border-2 border-amber-500/80 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.35)] flex flex-col items-center text-center max-w-md">
          <div className="flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-xs font-black text-amber-400 font-serif tracking-wider uppercase">
            <span className="text-xs sm:text-base animate-bounce">🚏</span>
            <span className="bg-amber-900/60 text-amber-200 px-1 py-0.2 rounded border border-amber-600/50 text-[7.5px] sm:text-[9px] font-mono font-bold">
              BUS HALT
            </span>
            <span className="truncate max-w-[130px] sm:max-w-none">{currentStopName || 'HIGHWAY TEA BREAK'}</span>
          </div>
          <span className="text-[8px] sm:text-[9.5px] text-amber-200/90 font-mono mt-0.5 font-semibold line-clamp-1">
            ☕ 15 min Tea Break • Conductor & Ambient Sounds Active
          </span>

          {/* Action Buttons inside Banner */}
          <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
            <button
              onClick={handleSipChai}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-amber-100 text-[8px] sm:text-xs font-black rounded-lg border border-amber-400 shadow-md transition flex items-center space-x-1 cursor-pointer"
              title="Order & Sip Hot Kulhad Masala Chai"
            >
              <span>☕</span>
              <span>Sip Chai ({chaiCount})</span>
            </button>

            <button
              onClick={() => playConductorWhistleSound(0.28)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-950/90 hover:bg-amber-900 active:scale-95 text-amber-300 text-[8px] sm:text-xs font-bold rounded-lg border border-amber-600/70 shadow-md transition flex items-center space-x-1 cursor-pointer"
              title="Blow Conductor Whistle"
            >
              <span>🌬️</span>
              <span>Whistle</span>
            </button>

            {onResumeJourney && (
              <button
                onClick={onResumeJourney}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-emerald-100 text-[8px] sm:text-xs font-bold rounded-lg border border-emerald-500/80 shadow-md transition flex items-center space-x-1 cursor-pointer"
                title="Resume Bus Journey"
              >
                <span>🚌</span>
                <span>Resume</span>
              </button>
            )}
          </div>
        </div>

        {/* Chai Toast Notification */}
        {showToast && (
          <div className="mt-1.5 bg-amber-400 text-stone-950 font-black text-[9px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-lg border border-amber-600 animate-bounce">
            ☕ Piping Hot Kulhad Masala Chai Sipped!
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. LEFT SCENERY EDGE: ROADSIDE TEA STALL ("SHARMA CHAI STALL")
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-[16%] sm:bottom-[22%] left-1 sm:left-4 z-35 flex flex-col items-start transition-all duration-700 ease-out transform translate-x-0 drop-shadow-2xl scale-[0.78] sm:scale-100 origin-bottom-left">
        {/* String Lights / Garland hanging across overhang */}
        <div className="flex space-x-2 mb-1 pl-2">
          {['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'].map((color, i) => (
            <div
              key={i}
              className="w-2.5 h-3.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse"
              style={{ backgroundColor: color, color, animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Vintage Illuminated Wooden Signboard */}
        <div className="bg-amber-950/95 border-2 border-amber-500 rounded-xl p-2.5 sm:p-3 shadow-2xl flex flex-col items-center w-44 sm:w-60 text-amber-100 relative">
          <div className="absolute -top-3 bg-amber-500 text-stone-950 font-black text-[8.5px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
            ★ FAMOUS HIGHWAY STOP ★
          </div>

          <div className="flex items-center space-x-1.5 text-xs sm:text-sm font-black text-amber-300 font-serif tracking-wide border-b border-amber-800 pb-1 w-full text-center justify-center mt-1">
            <span>🫖</span>
            <span>SHARMA CHAI STALL</span>
          </div>

          {/* Hand-painted chalk menu */}
          <div className="mt-1.5 text-[9.5px] sm:text-[11px] font-mono text-amber-200/90 space-y-0.5 w-full text-left bg-stone-900/80 p-1.5 sm:p-2 rounded-lg border border-amber-900/60">
            <div className="flex justify-between font-bold text-amber-400">
              <span>☕ Masala Kulhad Chai</span>
              <span>₹10</span>
            </div>
            <div className="flex justify-between">
              <span>🥪 Bun Maska / Samosa</span>
              <span>₹20</span>
            </div>
            <div className="flex justify-between">
              <span>🫓 Aloo Paratha + Dahi</span>
              <span>₹40</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-extrabold text-[8.5px]">
              <span>💧 Mineral Water</span>
              <span>₹15</span>
            </div>
          </div>

          {/* Clay Chulha Stove with Rising Steam SVG */}
          <div className="mt-2 flex items-center justify-between w-full px-1">
            <div className="flex items-center space-x-1.5">
              <div className="relative">
                {/* Brass Kettle */}
                <svg viewBox="0 0 40 32" className="w-6 h-5 text-amber-400 drop-shadow">
                  <path d="M 10 12 L 30 12 L 32 24 L 8 24 Z" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
                  <path d="M 20 6 L 20 12" stroke="#b45309" strokeWidth="2" />
                  <path d="M 32 16 Q 38 14 36 22" fill="none" stroke="#d97706" strokeWidth="2" />
                </svg>
                {/* Steam Particles */}
                <div className="absolute -top-3 left-2 flex space-x-1">
                  <span className="w-1 h-3 bg-white/70 rounded-full animate-ping opacity-75" />
                  <span className="w-1 h-4 bg-white/60 rounded-full animate-pulse opacity-60" />
                </div>
              </div>
              <span className="text-[8.5px] font-extrabold text-amber-300 font-mono">Fresh!</span>
            </div>

            <div className="text-[8px] bg-rose-900/80 text-rose-200 border border-rose-600 px-1 py-0.2 rounded font-bold">
              24x7
            </div>
          </div>
        </div>

        {/* Wooden Support Pole */}
        <div className="w-2 h-8 bg-amber-950 border-x border-amber-800 shadow-xl ml-8" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RIGHT SCENERY EDGE: "SHUDDH SHAKAHARI HIGHWAY DHABA" SIGN
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-[16%] sm:bottom-[22%] right-1 sm:right-4 z-35 flex flex-col items-end transition-all duration-700 ease-out transform translate-x-0 drop-shadow-2xl scale-[0.78] sm:scale-100 origin-bottom-right">
        {/* Lantern Light Glow */}
        <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)] mb-1 mr-8 border border-amber-200 animate-pulse" />

        {/* Traditional Highway Dhaba Signboard */}
        <div className="bg-stone-900/95 border-2 border-emerald-500 rounded-xl p-2.5 sm:p-3 shadow-2xl flex flex-col items-center w-44 sm:w-60 text-amber-100 relative">
          <div className="absolute -top-3 bg-emerald-600 text-emerald-950 font-black text-[8.5px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
            100% PURE VEG
          </div>

          <div className="flex items-center space-x-1.5 text-xs sm:text-sm font-black text-emerald-400 font-serif tracking-wide border-b border-stone-800 pb-1 w-full text-center justify-center mt-1">
            <span>🌾</span>
            <span>HIGHWAY PUNJABI DHABA</span>
          </div>

          {/* Dhaba Specials */}
          <div className="mt-1.5 text-[9.5px] sm:text-[11px] font-mono text-stone-300 space-y-0.5 w-full text-left bg-stone-950/80 p-1.5 sm:p-2 rounded-lg border border-stone-800">
            <div className="text-amber-300 font-extrabold flex items-center justify-between">
              <span>🍲 Dal Makhani + Roti</span>
              <span>₹120</span>
            </div>
            <div className="text-stone-300 flex items-center justify-between">
              <span>🥛 Meethi Lassi</span>
              <span>₹30</span>
            </div>
            <div className="text-amber-200 flex items-center justify-between text-[8.5px]">
              <span>🚏 Restroom</span>
              <span className="text-emerald-400 font-bold">FREE</span>
            </div>
          </div>

          {/* Waving Dhaba Staff & Charpai Cot Icon */}
          <div className="mt-2 flex items-center justify-between w-full px-1">
            <span className="text-[8.5px] font-extrabold text-amber-400 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-700">
              🛏️ Charpai
            </span>
            <span className="text-[8.5px] font-bold text-emerald-300">Welcome! 🙏</span>
          </div>
        </div>

        {/* Right Wooden Support Pole */}
        <div className="w-2 h-8 bg-stone-900 border-x border-stone-700 shadow-xl mr-8" />
      </div>
    </div>
  );
};

