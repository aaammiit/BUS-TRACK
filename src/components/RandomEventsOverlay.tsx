import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  playBirdChirpSound,
  playCowBellSound,
  playRickshawSound,
  playDogBarkSound,
  playTruckHornSound,
  playTrainWhistleSound,
  playChaiSellerSound,
  playTractorSound,
  playBusHorn
} from '../utils/audioSynth';

export type EventType =
  | 'birds'
  | 'cow'
  | 'rickshaw'
  | 'dog'
  | 'lorry'
  | 'scooter'
  | 'peacock'
  | 'train'
  | 'tractor'
  | 'chai_seller'
  | 'monkey'
  | 'bus_opposite';

export interface ActiveEvent {
  id: string;
  type: EventType;
  title: string;
  badge: string;
  description: string;
  startTime: number;
  durationMs: number;
  direction: 'left-to-right' | 'right-to-left';
  speedMs: number;
}

interface RandomEventsOverlayProps {
  isMoving: boolean;
  isNight?: boolean;
  onEventActiveChange?: (activeEvent: ActiveEvent | null) => void;
  externalTriggerToken?: number;
}

const EVENT_TYPES: {
  type: EventType;
  title: string;
  badge: string;
  description: string;
  durationMs: number;
  soundEffect: () => void;
}[] = [
  {
    type: 'birds',
    title: 'Flock of Birds',
    badge: '🦅 Sky Wildlife',
    description: 'A flock of migratory birds takes flight across the sky!',
    durationMs: 7000,
    soundEffect: () => playBirdChirpSound()
  },
  {
    type: 'cow',
    title: 'Sacred Cow Crossing',
    badge: '🐄 Roadside Encounter',
    description: 'A sacred cow gently crosses near the roadside. Honking softly!',
    durationMs: 8500,
    soundEffect: () => {
      playCowBellSound();
      setTimeout(() => playBusHorn(0.4), 1200);
    }
  },
  {
    type: 'rickshaw',
    title: 'Auto Rickshaw Overtake',
    badge: '🛺 Highway Overtake',
    description: 'A vibrant yellow-green Auto Rickshaw zooms past!',
    durationMs: 6000,
    soundEffect: () => playRickshawSound()
  },
  {
    type: 'dog',
    title: 'Street Dog Sprint',
    badge: '🐕 Friendly Companion',
    description: 'A happy stray dog sprints alongside the bus wheel!',
    durationMs: 6500,
    soundEffect: () => playDogBarkSound()
  },
  {
    type: 'lorry',
    title: 'Decorated Tata Lorry',
    badge: '🛻 HORN OK PLEASE',
    description: 'A heavily decorated goods truck rumbles down the lane!',
    durationMs: 7500,
    soundEffect: () => playTruckHornSound()
  },
  {
    type: 'scooter',
    title: 'Bajaj Family Scooter',
    badge: '🛵 Highway Cruiser',
    description: 'A family riding a Chetak scooter cruises along smoothly!',
    durationMs: 6500,
    soundEffect: () => playRickshawSound()
  },
  {
    type: 'peacock',
    title: 'National Peacock Flight',
    badge: '🦚 Scenic Beauty',
    description: 'A majestic Indian peacock flutters gracefully past!',
    durationMs: 8000,
    soundEffect: () => playBirdChirpSound()
  },
  {
    type: 'train',
    title: 'Vande Bharat Express',
    badge: '🚆 Railway Crossing',
    description: 'An express passenger train speeds past on the background tracks!',
    durationMs: 8000,
    soundEffect: () => playTrainWhistleSound()
  },
  {
    type: 'tractor',
    title: 'Sugarcane Tractor',
    badge: '🚜 Rural Harvest',
    description: 'A farmer driving a sugarcane Mahindra tractor chugs along!',
    durationMs: 7500,
    soundEffect: () => playTractorSound()
  },
  {
    type: 'chai_seller',
    title: 'Roadside Chai Stall',
    badge: '☕ Kulhad Chai',
    description: 'A roadside Chaiwala waves warmly holding fresh teacups!',
    durationMs: 6500,
    soundEffect: () => playChaiSellerSound()
  },
  {
    type: 'monkey',
    title: 'Playful Langur Monkey',
    badge: '🐒 Tree Canopy',
    description: 'A playful monkey leaps gracefully across roadside trees!',
    durationMs: 6000,
    soundEffect: () => playBirdChirpSound()
  },
  {
    type: 'bus_opposite',
    title: 'Red Roadways Express',
    badge: '🚌 Opposite Lane',
    description: 'A state transport passenger bus zooms by in the opposite lane!',
    durationMs: 6500,
    soundEffect: () => {
      playTruckHornSound();
      setTimeout(() => playBusHorn(0.5), 800);
    }
  }
];

export const RandomEventsOverlay: React.FC<RandomEventsOverlayProps> = ({
  isMoving,
  isNight = false,
  onEventActiveChange,
  externalTriggerToken = 0
}) => {
  const [currentEvent, setCurrentEvent] = useState<ActiveEvent | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const lastTriggerTokenRef = useRef(externalTriggerToken);

  const triggerRandomEvent = useCallback((forcedType?: EventType) => {
    let chosen = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    if (forcedType) {
      const match = EVENT_TYPES.find((e) => e.type === forcedType);
      if (match) chosen = match;
    }

    const direction: 'left-to-right' | 'right-to-left' = Math.random() > 0.3 ? 'left-to-right' : 'right-to-left';

    const newEvent: ActiveEvent = {
      id: `${chosen.type}-${Date.now()}`,
      type: chosen.type,
      title: chosen.title,
      badge: chosen.badge,
      description: chosen.description,
      startTime: Date.now(),
      durationMs: chosen.durationMs,
      direction,
      speedMs: chosen.durationMs
    };

    setCurrentEvent(newEvent);
    setToastVisible(true);
    chosen.soundEffect();

    if (onEventActiveChange) {
      onEventActiveChange(newEvent);
    }

    // Auto dismiss after duration
    setTimeout(() => {
      setCurrentEvent((prev) => (prev?.id === newEvent.id ? null : prev));
      setToastVisible(false);
      if (onEventActiveChange) {
        onEventActiveChange(null);
      }
    }, chosen.durationMs);
  }, [onEventActiveChange]);

  // Listen to manual button trigger token changes
  useEffect(() => {
    if (externalTriggerToken !== lastTriggerTokenRef.current) {
      lastTriggerTokenRef.current = externalTriggerToken;
      triggerRandomEvent();
    }
  }, [externalTriggerToken, triggerRandomEvent]);

  // Periodic random trigger every 14-26 seconds when bus is moving
  useEffect(() => {
    if (!isMoving) return;

    const intervalTime = Math.floor(14000 + Math.random() * 12000); // 14 to 26s
    const timer = setInterval(() => {
      // 70% chance to trigger event during check
      if (Math.random() < 0.75) {
        triggerRandomEvent();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isMoving, triggerRandomEvent]);

  return (
    <div className="absolute inset-0 pointer-events-none z-28 overflow-hidden select-none">
      {/* EVENT NOTIFICATION TOAST BANNER */}
      {currentEvent && toastVisible && (
        <div className="absolute top-[clamp(30px,8.5vh,48px)] left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-out animate-bounce-short">
          <div className="bg-stone-950/95 backdrop-blur-md border border-amber-500/80 px-2.5 sm:px-3 py-1 rounded-xl sm:rounded-2xl shadow-2xl flex items-center space-x-2 text-stone-100 min-w-[200px] max-w-[85vw] sm:max-w-md">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-xs sm:text-sm font-bold shadow-md shrink-0">
              ⚡
            </div>
            <div className="flex flex-col text-left truncate">
              <div className="flex items-center space-x-1.5">
                <span className="text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-800/80">
                  {currentEvent.badge}
                </span>
                <span className="text-[9px] sm:text-xs font-bold text-stone-200 truncate">{currentEvent.title}</span>
              </div>
              <p className="text-[8px] sm:text-[9.5px] text-stone-300 font-medium line-clamp-1 mt-0.2">
                {currentEvent.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED EVENT GRAPHICS ON THE ROAD / SKY */}
      {currentEvent && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 1. FLOCK OF BIRDS */}
          {currentEvent.type === 'birds' && (
            <div
              className={`absolute top-[12%] h-20 flex space-x-6 items-center ${
                currentEvent.direction === 'left-to-right' ? 'animate-fly-right' : 'animate-fly-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="w-8 h-6 text-stone-900 opacity-80 dark:text-stone-100"
                  style={{
                    transform: `scale(${0.7 + idx * 0.15}) translateY(${Math.sin(idx) * 12}px)`
                  }}
                >
                  <svg viewBox="0 0 50 30" className="w-full h-full fill-current animate-wing-flap">
                    <path d="M 0,15 Q 12,0 25,15 Q 38,0 50,15 Q 38,8 25,20 Q 12,8 0,15 Z" />
                  </svg>
                </div>
              ))}
            </div>
          )}

          {/* 2. SACRED COW CROSSING */}
          {currentEvent.type === 'cow' && (
            <div
              className={`absolute bottom-[18%] sm:bottom-[20%] h-24 sm:h-28 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-walk-right' : 'animate-walk-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative flex flex-col items-center">
                {/* Cow SVG */}
                <svg viewBox="0 0 120 80" className="w-28 h-20 sm:w-36 sm:h-24 drop-shadow-xl">
                  {/* Body */}
                  <ellipse cx="60" cy="48" rx="35" ry="22" fill="#f5f5f4" stroke="#44403c" strokeWidth="2" />
                  {/* Spots */}
                  <path d="M 40,35 Q 50,30 55,42 Q 45,50 40,35 Z" fill="#292524" />
                  <path d="M 70,40 Q 82,38 78,52 Q 68,52 70,40 Z" fill="#292524" />
                  {/* Legs with walking animation */}
                  <rect x="35" y="65" width="6" height="15" rx="3" fill="#44403c" className="animate-leg-front" />
                  <rect x="48" y="65" width="6" height="15" rx="3" fill="#292524" className="animate-leg-back" />
                  <rect x="70" y="65" width="6" height="15" rx="3" fill="#44403c" className="animate-leg-front" />
                  <rect x="83" y="65" width="6" height="15" rx="3" fill="#292524" className="animate-leg-back" />
                  {/* Head */}
                  <ellipse cx="102" cy="35" rx="14" ry="11" fill="#f5f5f4" stroke="#44403c" strokeWidth="2" />
                  {/* Muzzle */}
                  <ellipse cx="112" cy="38" rx="7" ry="6" fill="#fbcfe8" />
                  {/* Horns */}
                  <path d="M 98,26 Q 95,16 100,14" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 104,26 Q 102,16 107,14" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
                  {/* Bell Collar */}
                  <path d="M 92,42 Q 96,48 100,42" stroke="#d97706" strokeWidth="3" fill="none" />
                  <circle cx="96" cy="47" r="3" fill="#fbbf24" />
                  {/* Tail */}
                  <path d="M 25,48 Q 15,55 18,68" stroke="#44403c" strokeWidth="2" fill="none" className="animate-tail-sway" />
                </svg>
                <div className="bg-amber-100 border border-amber-800 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-md mt-1 animate-pulse">
                  Moo~ 🔔
                </div>
              </div>
            </div>
          )}

          {/* 3. AUTO RICKSHAW */}
          {currentEvent.type === 'rickshaw' && (
            <div
              className={`absolute bottom-[16%] sm:bottom-[18%] h-24 sm:h-28 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-drive-right' : 'animate-drive-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative">
                <svg viewBox="0 0 140 90" className="w-32 h-24 sm:w-40 sm:h-28 drop-shadow-2xl">
                  {/* Canopy Hood (Yellow top) */}
                  <path d="M 20,40 Q 30,10 80,10 L 115,15 Q 130,20 130,45 L 125,55 L 15,55 Z" fill="#eab308" stroke="#854d0e" strokeWidth="2" />
                  {/* Green Body Bottom */}
                  <rect x="15" y="52" width="112" height="22" rx="4" fill="#15803d" stroke="#14532d" strokeWidth="2" />
                  {/* Windshield */}
                  <path d="M 90,20 L 122,22 L 120,48 L 88,48 Z" fill="#93c5fd" opacity="0.8" />
                  {/* Driver silhouette */}
                  <circle cx="102" cy="38" r="7" fill="#1e293b" />
                  {/* Wheels */}
                  <circle cx="35" cy="74" r="11" fill="#1c1917" stroke="#78716c" strokeWidth="3" className="animate-wheel-spin" />
                  <circle cx="108" cy="74" r="11" fill="#1c1917" stroke="#78716c" strokeWidth="3" className="animate-wheel-spin" />
                  {/* Headlight */}
                  <circle cx="128" cy="58" r="4" fill="#fef08a" className="animate-pulse" />
                  {/* Exhaust smoke */}
                  <circle cx="8" cy="70" r="4" fill="#94a3b8" opacity="0.6" className="animate-ping" />
                </svg>
              </div>
            </div>
          )}

          {/* 4. STREET DOG SPRINT */}
          {currentEvent.type === 'dog' && (
            <div
              className={`absolute bottom-[15%] sm:bottom-[17%] h-16 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-run-right' : 'animate-run-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative flex flex-col items-center">
                <svg viewBox="0 0 90 50" className="w-20 h-12 sm:w-24 sm:h-14 drop-shadow-md">
                  {/* Body */}
                  <ellipse cx="45" cy="28" rx="22" ry="12" fill="#d97706" />
                  {/* Head */}
                  <circle cx="72" cy="18" r="9" fill="#b45309" />
                  {/* Snout */}
                  <ellipse cx="80" cy="21" rx="6" ry="4" fill="#d97706" />
                  <circle cx="84" cy="19" r="2" fill="#18181b" />
                  {/* Ears */}
                  <path d="M 66,10 L 72,4 L 74,12 Z" fill="#78350f" />
                  {/* Tail wagging */}
                  <path d="M 23,26 Q 12,18 10,10" stroke="#b45309" strokeWidth="3" fill="none" strokeLinecap="round" className="animate-tail-wag" />
                  {/* Running legs */}
                  <line x1="30" y1="38" x2="22" y2="48" stroke="#78350f" strokeWidth="3" className="animate-leg-run-1" />
                  <line x1="38" y1="38" x2="48" y2="48" stroke="#78350f" strokeWidth="3" className="animate-leg-run-2" />
                  <line x1="56" y1="38" x2="50" y2="48" stroke="#78350f" strokeWidth="3" className="animate-leg-run-1" />
                  <line x1="64" y1="38" x2="72" y2="48" stroke="#78350f" strokeWidth="3" className="animate-leg-run-2" />
                </svg>
                <span className="text-[8px] font-bold text-amber-300 bg-stone-900/80 px-1 rounded mt-0.5">Woof! 🐾</span>
              </div>
            </div>
          )}

          {/* 5. TATA GOODS LORRY TRUCK */}
          {currentEvent.type === 'lorry' && (
            <div
              className={`absolute bottom-[16%] sm:bottom-[19%] h-28 sm:h-32 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-drive-right' : 'animate-drive-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative">
                <svg viewBox="0 0 200 100" className="w-48 h-28 sm:w-60 sm:h-34 drop-shadow-2xl">
                  {/* Cargo Container (Decorated Body) */}
                  <rect x="10" y="15" width="120" height="55" rx="3" fill="#2563eb" stroke="#1e3a8a" strokeWidth="2" />
                  {/* Decorative stripes on truck body */}
                  <rect x="10" y="30" width="120" height="8" fill="#f59e0b" />
                  <rect x="10" y="42" width="120" height="8" fill="#dc2626" />
                  {/* "HORN OK PLEASE" emblem */}
                  <text x="70" y="58" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                    HORN OK PLEASE
                  </text>
                  {/* Driver Cabin */}
                  <path d="M 130,30 L 175,30 L 190,50 L 190,70 L 130,70 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                  {/* Windshield */}
                  <path d="M 152,34 L 172,34 L 182,48 L 152,48 Z" fill="#a5f3fc" opacity="0.85" />
                  {/* Wheels */}
                  <circle cx="35" cy="74" r="12" fill="#18181b" stroke="#71717a" strokeWidth="4" />
                  <circle cx="65" cy="74" r="12" fill="#18181b" stroke="#71717a" strokeWidth="4" />
                  <circle cx="160" cy="74" r="12" fill="#18181b" stroke="#71717a" strokeWidth="4" />
                </svg>
              </div>
            </div>
          )}

          {/* 6. SCOOTER FAMILY */}
          {currentEvent.type === 'scooter' && (
            <div
              className={`absolute bottom-[16%] sm:bottom-[18%] h-20 sm:h-24 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-drive-right' : 'animate-drive-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative">
                <svg viewBox="0 0 110 70" className="w-28 h-20 sm:w-32 sm:h-22 drop-shadow-lg">
                  {/* Scooter Body */}
                  <path d="M 20,45 Q 40,45 55,50 L 85,50 L 95,35 L 80,35 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
                  {/* Handlebars */}
                  <line x1="82" y1="35" x2="88" y2="20" stroke="#334155" strokeWidth="3" />
                  {/* Rider silhouette */}
                  <circle cx="70" cy="18" r="6" fill="#1e293b" />
                  <rect x="65" y="24" width="12" height="18" rx="2" fill="#2563eb" />
                  {/* Passenger silhouette behind */}
                  <circle cx="50" cy="22" r="5" fill="#e11d48" />
                  <rect x="46" y="27" width="10" height="15" rx="2" fill="#e11d48" />
                  {/* Wheels */}
                  <circle cx="30" cy="54" r="9" fill="#18181b" stroke="#94a3b8" strokeWidth="3" />
                  <circle cx="85" cy="54" r="9" fill="#18181b" stroke="#94a3b8" strokeWidth="3" />
                </svg>
              </div>
            </div>
          )}

          {/* 7. PEACOCK / SHOOTING STAR */}
          {currentEvent.type === 'peacock' && (
            <div
              className={`absolute top-[18%] h-24 flex items-center ${
                currentEvent.direction === 'left-to-right' ? 'animate-fly-right' : 'animate-fly-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              {isNight ? (
                /* Glowing Shooting Star at Night */
                <div className="flex items-center space-x-2 animate-pulse">
                  <div className="w-20 h-1 bg-gradient-to-r from-transparent via-amber-200 to-white rounded-full shadow-[0_0_15px_#fef08a]" />
                  <span className="text-xl">⭐</span>
                </div>
              ) : (
                /* Majestic Peacock Day Flight */
                <svg viewBox="0 0 100 60" className="w-24 h-16 sm:w-32 sm:h-20 drop-shadow-xl">
                  {/* Peacock Fan Tail */}
                  <path d="M 10,30 Q 30,0 50,20 Q 30,40 10,30 Z" fill="#0284c7" opacity="0.85" />
                  <circle cx="22" cy="18" r="3" fill="#fbbf24" />
                  <circle cx="28" cy="28" r="3" fill="#fbbf24" />
                  <circle cx="18" cy="26" r="3" fill="#fbbf24" />
                  {/* Body & Neck */}
                  <path d="M 45,25 Q 55,10 65,15 Q 75,20 68,32 Q 55,40 45,25 Z" fill="#0369a1" />
                  {/* Crown Feathers */}
                  <line x1="68" y1="13" x2="72" y2="6" stroke="#fbbf24" strokeWidth="1.5" />
                  <circle cx="72" cy="5" r="2" fill="#0284c7" />
                  {/* Wings */}
                  <path d="M 48,22 Q 35,12 28,24 Q 40,30 48,22 Z" fill="#15803d" className="animate-wing-flap" />
                </svg>
              )}
            </div>
          )}

          {/* 8. VANDE BHARAT EXPRESS PASSENGER TRAIN */}
          {currentEvent.type === 'train' && (
            <div
              className={`absolute top-[32%] sm:top-[30%] h-16 flex items-center ${
                currentEvent.direction === 'left-to-right' ? 'animate-drive-right' : 'animate-drive-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative">
                <svg viewBox="0 0 280 40" className="w-64 h-10 sm:w-96 sm:h-14 drop-shadow-lg">
                  {/* Train Track Lines */}
                  <line x1="0" y1="36" x2="280" y2="36" stroke="#475569" strokeWidth="2" />
                  {/* Aerodynamic Locomotive Engine (White & Blue) */}
                  <path d="M 0 10 L 40 10 Q 55 10 60 22 L 60 34 L 0 34 Z" fill="#f8fafc" stroke="#2563eb" strokeWidth="2" />
                  <path d="M 40 12 L 58 22 L 58 28 L 38 28 Z" fill="#2563eb" />
                  {/* Passenger Coaches */}
                  {Array.from({ length: 4 }).map((_, cIdx) => (
                    <g key={cIdx} transform={`translate(${65 + cIdx * 52}, 10)`}>
                      <rect x="0" y="0" width="48" height="24" rx="2" fill="#f8fafc" stroke="#2563eb" strokeWidth="1.5" />
                      <rect x="0" y="16" width="48" height="5" fill="#2563eb" />
                      {/* Coach Windows */}
                      <rect x="6" y="4" width="8" height="8" rx="1" fill="#0284c7" />
                      <rect x="18" y="4" width="8" height="8" rx="1" fill="#0284c7" />
                      <rect x="30" y="4" width="8" height="8" rx="1" fill="#0284c7" />
                      {/* Wheels */}
                      <circle cx="10" cy="25" r="3" fill="#1e293b" />
                      <circle cx="38" cy="25" r="3" fill="#1e293b" />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}

          {/* 9. SUGARCANE TRACTOR */}
          {currentEvent.type === 'tractor' && (
            <div
              className={`absolute bottom-[16%] sm:bottom-[18%] h-24 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-drive-right' : 'animate-drive-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative">
                <svg viewBox="0 0 160 80" className="w-36 h-20 sm:w-44 sm:h-24 drop-shadow-xl">
                  {/* Sugarcane Trailer */}
                  <rect x="10" y="30" width="75" height="30" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="2" />
                  {/* Sugarcane Stalks */}
                  <path d="M 12 30 Q 30 10 50 28 Q 70 12 82 30 Z" fill="#65a30d" />
                  <line x1="20" y1="30" x2="25" y2="12" stroke="#4d7c0f" strokeWidth="2" />
                  <line x1="45" y1="30" x2="52" y2="10" stroke="#4d7c0f" strokeWidth="2" />
                  <line x1="68" y1="30" x2="72" y2="14" stroke="#4d7c0f" strokeWidth="2" />
                  <circle cx="28" cy="62" r="10" fill="#18181b" stroke="#71717a" strokeWidth="3" />
                  <circle cx="68" cy="62" r="10" fill="#18181b" stroke="#71717a" strokeWidth="3" />
                  {/* Red Mahindra Tractor Engine */}
                  <rect x="90" y="38" width="55" height="22" rx="3" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                  <path d="M 105 22 L 125 22 L 125 38 L 105 38 Z" fill="#dc2626" />
                  <circle cx="115" cy="18" r="5" fill="#1e293b" />
                  {/* Big Rear Tractor Wheel */}
                  <circle cx="102" cy="60" r="16" fill="#18181b" stroke="#f59e0b" strokeWidth="4" />
                  {/* Small Front Wheel */}
                  <circle cx="138" cy="62" r="9" fill="#18181b" stroke="#f59e0b" strokeWidth="3" />
                  {/* Exhaust Pipe Silencer */}
                  <line x1="130" y1="38" x2="130" y2="15" stroke="#475569" strokeWidth="3" />
                  <circle cx="130" cy="12" r="3" fill="#94a3b8" opacity="0.6" className="animate-ping" />
                </svg>
              </div>
            </div>
          )}

          {/* 10. ROADSIDE CHAI SELLER */}
          {currentEvent.type === 'chai_seller' && (
            <div
              className={`absolute bottom-[17%] sm:bottom-[19%] h-20 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-walk-right' : 'animate-walk-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative flex flex-col items-center">
                <svg viewBox="0 0 100 70" className="w-28 h-20 sm:w-32 sm:h-22 drop-shadow-md">
                  {/* Chai Cart / Stall */}
                  <rect x="15" y="30" width="60" height="28" rx="3" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                  <rect x="20" y="24" width="22" height="6" rx="1" fill="#fbbf24" />
                  {/* Kettle with Steam */}
                  <path d="M 24 16 L 36 16 L 38 24 L 22 24 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                  <path d="M 30 14 Q 28 8 30 4" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8" className="animate-pulse" />
                  {/* Kulhad Glasses */}
                  <rect x="46" y="25" width="5" height="5" fill="#f59e0b" />
                  <rect x="53" y="25" width="5" height="5" fill="#f59e0b" />
                  <rect x="60" y="25" width="5" height="5" fill="#f59e0b" />
                  {/* Wheels */}
                  <circle cx="28" cy="58" r="7" fill="#18181b" stroke="#78350f" strokeWidth="2" />
                  <circle cx="62" cy="58" r="7" fill="#18181b" stroke="#78350f" strokeWidth="2" />
                  {/* Waving Chaiwala */}
                  <circle cx="82" cy="20" r="6" fill="#f59e0b" />
                  <rect x="78" y="26" width="8" height="22" rx="2" fill="#15803d" />
                  <line x1="84" y1="28" x2="94" y2="16" stroke="#f59e0b" strokeWidth="2.5" className="animate-bounce" />
                </svg>
                <span className="text-[8px] font-black text-amber-200 bg-amber-950/90 border border-amber-600 px-1.5 py-0.5 rounded-full shadow mt-0.5">
                  Garam Chai! ☕
                </span>
              </div>
            </div>
          )}

          {/* 11. PLAYFUL LANGUR MONKEY */}
          {currentEvent.type === 'monkey' && (
            <div
              className={`absolute top-[22%] sm:top-[20%] h-20 flex items-center ${
                currentEvent.direction === 'left-to-right' ? 'animate-fly-right' : 'animate-fly-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative flex flex-col items-center">
                <svg viewBox="0 0 80 50" className="w-20 h-14 sm:w-24 sm:h-16 drop-shadow-lg">
                  {/* Body */}
                  <ellipse cx="40" cy="25" rx="14" ry="10" fill="#78350f" />
                  <circle cx="56" cy="18" r="8" fill="#451a03" />
                  <ellipse cx="60" cy="20" rx="4" ry="3" fill="#fbcfe8" />
                  {/* Long Curved Tail */}
                  <path d="M 26 25 Q 12 10 18 2" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" className="animate-tail-sway" />
                  {/* Swinging Arms */}
                  <line x1="42" y1="32" x2="35" y2="44" stroke="#451a03" strokeWidth="3" />
                  <line x1="48" y1="32" x2="55" y2="44" stroke="#451a03" strokeWidth="3" />
                </svg>
                <span className="text-[8px] font-extrabold text-amber-300 bg-stone-900/80 px-1 rounded">Kho-Kho! 🐒</span>
              </div>
            </div>
          )}

          {/* 12. STATE ROADWAYS RED EXPRESS BUS IN OPPOSITE LANE */}
          {currentEvent.type === 'bus_opposite' && (
            <div
              className={`absolute bottom-[16%] sm:bottom-[19%] h-28 sm:h-32 flex items-end ${
                currentEvent.direction === 'left-to-right' ? 'animate-drive-right' : 'animate-drive-left'
              }`}
              style={{ animationDuration: `${currentEvent.durationMs}ms` }}
            >
              <div className="relative">
                <svg viewBox="0 0 180 90" className="w-44 h-24 sm:w-52 sm:h-28 drop-shadow-2xl">
                  {/* Red Bus Body */}
                  <rect x="10" y="15" width="160" height="52" rx="6" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                  {/* White Accent Roof Band */}
                  <rect x="10" y="15" width="160" height="12" fill="#f8fafc" />
                  {/* Bus Windows */}
                  {Array.from({ length: 5 }).map((_, wIdx) => (
                    <rect key={wIdx} x={20 + wIdx * 28} y={32} width="20" height="18" rx="2" fill="#bae6fd" opacity="0.8" />
                  ))}
                  {/* Destination Board */}
                  <rect x="50" y="18" width="80" height="8" fill="#000000" />
                  <text x="90" y="24" fill="#fbbf24" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    STATE ROADWAYS
                  </text>
                  {/* Wheels */}
                  <circle cx="45" cy="67" r="11" fill="#18181b" stroke="#94a3b8" strokeWidth="3" />
                  <circle cx="135" cy="67" r="11" fill="#18181b" stroke="#94a3b8" strokeWidth="3" />
                  {/* Headlights */}
                  <circle cx="168" cy="52" r="4" fill="#fef08a" className="animate-pulse" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAILWIND CSS ANIMATIONS INJECTED KEYFRAMES */}
      <style>{`
        @keyframes flyRight {
          0% { transform: translateX(-20vw); }
          100% { transform: translateX(110vw); }
        }
        @keyframes flyLeft {
          0% { transform: translateX(110vw); }
          100% { transform: translateX(-20vw); }
        }
        @keyframes walkRight {
          0% { transform: translateX(-20vw); }
          100% { transform: translateX(110vw); }
        }
        @keyframes walkLeft {
          0% { transform: translateX(110vw); }
          100% { transform: translateX(-20vw); }
        }
        @keyframes driveRight {
          0% { transform: translateX(-25vw); }
          100% { transform: translateX(115vw); }
        }
        @keyframes driveLeft {
          0% { transform: translateX(115vw); }
          100% { transform: translateX(-25vw); }
        }
        @keyframes runRight {
          0% { transform: translateX(-15vw); }
          100% { transform: translateX(110vw); }
        }
        @keyframes runLeft {
          0% { transform: translateX(110vw); }
          100% { transform: translateX(-15vw); }
        }
        @keyframes wingFlap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(-0.6); }
        }
        @keyframes tailSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes tailWag {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(20deg); }
        }

        .animate-fly-right { animation: flyRight linear forwards; }
        .animate-fly-left { animation: flyLeft linear forwards; }
        .animate-walk-right { animation: walkRight linear forwards; }
        .animate-walk-left { animation: walkLeft linear forwards; }
        .animate-drive-right { animation: driveRight linear forwards; }
        .animate-drive-left { animation: driveLeft linear forwards; }
        .animate-run-right { animation: runRight linear forwards; }
        .animate-run-left { animation: runLeft linear forwards; }
        .animate-wing-flap { animation: wingFlap 0.22s ease-in-out infinite; transform-origin: center; }
        .animate-tail-sway { animation: tailSway 1s ease-in-out infinite; transform-origin: top left; }
        .animate-tail-wag { animation: tailWag 0.15s ease-in-out infinite; transform-origin: bottom right; }
      `}</style>
    </div>
  );
};
