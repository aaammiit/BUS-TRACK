import React, { useEffect, useState, useRef } from 'react';
import { SceneConfig, SceneType, JourneySpeed, ViewMode } from '../types';
import { SCENES } from '../data/scenes';
import { WindshieldWiper } from './WindshieldWiper';
import { RandomEventsOverlay } from './RandomEventsOverlay';
import { BusStopOverlay } from './BusStopOverlay';
import { MegaphoneHorn } from './MegaphoneHorn';
import { playBusHorn, setHornMp3File } from '../utils/audioSynth';

interface BusSceneProps {
  sceneType: SceneType;
  isPlaying: boolean;
  isAtBusStop: boolean;
  currentStopName: string;
  journeySpeed?: JourneySpeed;
  currentTime?: number;
  duration?: number;
  viewMode?: ViewMode;
  onViewModeChange?: (view: ViewMode) => void;
  onSceneChange?: (sceneType: SceneType) => void;
  onSpeedChange?: (speed: JourneySpeed) => void;
  onToggleRadio?: () => void;
}

const safeNum = (v: number, fallback: number = 0) => (isNaN(v) || !isFinite(v) ? fallback : v);

// Pre-allocated static arrays to eliminate Garbage Collector pauses and jank on Android
const CABIN_CLOUD_INDICES = [0, 1, 2, 3, 4, 5];
const CABIN_ROAD_SLICES = Array.from({ length: 28 }, (_, i) => i);
const REAR_ROAD_SLICES = Array.from({ length: 28 }, (_, i) => i);
const CAT_EYE_INDICES = Array.from({ length: 14 }, (_, i) => i);
const LANE_DASH_INDICES = Array.from({ length: 14 }, (_, i) => i);
const TREE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];
const REAR_LAMP_INDICES = [0, 1, 2, 3, 4, 5];
const REAR_POLE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];
const REAR_SIGN_INDICES = [0, 1, 2, 3];
const RAIN_STREAK_CABIN_INDICES = Array.from({ length: 24 }, (_, i) => i);
const RAIN_DROP_CABIN_INDICES = Array.from({ length: 24 }, (_, i) => i);
const RAIN_STREAK_SIDE_INDICES = Array.from({ length: 28 }, (_, i) => i);
const REAR_LADDER_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const SIDE_MOUNTAIN_INDICES = [0, 1, 2, 3, 4, 5];
const SIDE_HILLS_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];
const SIDE_POLE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const SIDE_DASH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const SIDE_POST_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function getTimeOfDayDetails(progress: number) {
  const p = safeNum(Math.min(Math.max(progress, 0), 1), 0);

  // Convert 0..1 track progress to simulated 24h clock: 06:00 AM (0.0) -> 12:00 PM (0.35) -> 06:30 PM (0.70) -> 11:59 PM (1.0)
  const totalMins = 360 + p * 1080;
  const hrs = Math.floor(totalMins / 60) % 24;
  const mins = Math.floor(totalMins % 60);
  const period = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
  const timeString = `${displayHrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;

  if (p <= 0.25) {
    const subP = p / 0.25;
    const warmth = 0.22 - subP * 0.10;
    return {
      progress: p,
      phaseName: 'SUNRISE',
      timeString,
      icon: '🌅',
      overlayBg: `linear-gradient(to bottom, rgba(251, 146, 60, ${warmth.toFixed(2)}), rgba(253, 224, 71, ${(warmth * 0.35).toFixed(2)}), transparent)`,
      badgeGlow: '0 0 12px rgba(251, 146, 60, 0.8)',
      badgeBg: 'from-amber-600/90 to-orange-700/90 border-amber-400'
    };
  } else if (p <= 0.60) {
    const subP = (p - 0.25) / 0.35;
    return {
      progress: p,
      phaseName: 'MIDDAY',
      timeString,
      icon: '☀️',
      overlayBg: `linear-gradient(to bottom, rgba(253, 224, 71, ${(0.08 - subP * 0.04).toFixed(2)}), rgba(251, 146, 60, ${(subP * 0.08).toFixed(2)}), transparent)`,
      badgeGlow: '0 0 12px rgba(250, 204, 21, 0.8)',
      badgeBg: 'from-yellow-600/90 to-amber-700/90 border-yellow-400'
    };
  } else if (p <= 0.85) {
    const subP = (p - 0.60) / 0.25;
    const roseAlpha = 0.18 * (1 - subP);
    const indigoAlpha = 0.20 * subP;
    return {
      progress: p,
      phaseName: 'SUNSET DUSK',
      timeString,
      icon: '🌆',
      overlayBg: `linear-gradient(to bottom, rgba(244, 63, 94, ${roseAlpha.toFixed(2)}), rgba(99, 102, 241, ${indigoAlpha.toFixed(2)}), transparent)`,
      badgeGlow: '0 0 14px rgba(244, 63, 94, 0.85)',
      badgeBg: 'from-rose-700/90 to-purple-800/90 border-rose-400'
    };
  } else {
    const subP = (p - 0.85) / 0.15;
    const blueAlpha = 0.22 + subP * 0.12;
    const cyanAlpha = 0.06 + subP * 0.06;
    return {
      progress: p,
      phaseName: 'MIDNIGHT',
      timeString,
      icon: '🌙',
      overlayBg: `linear-gradient(to bottom, rgba(15, 23, 42, ${blueAlpha.toFixed(2)}), rgba(14, 165, 233, ${cyanAlpha.toFixed(2)}), rgba(30, 58, 138, ${(blueAlpha * 0.5).toFixed(2)}))`,
      badgeGlow: '0 0 14px rgba(56, 189, 248, 0.85)',
      badgeBg: 'from-indigo-900/90 to-slate-950/90 border-sky-400'
    };
  }
}

export const BusScene: React.FC<BusSceneProps> = ({
  sceneType,
  isPlaying,
  isAtBusStop,
  currentStopName,
  journeySpeed = 'normal',
  currentTime = 0,
  duration = 0,
  viewMode: propViewMode,
  onViewModeChange,
  onSceneChange,
  onSpeedChange,
  onToggleRadio
}) => {
  const scene: SceneConfig = SCENES[sceneType] || SCENES.autumn;
  const [manualHalt, setManualHalt] = useState(false);
  const effectiveIsAtBusStop = isAtBusStop || manualHalt;
  const isMoving = isPlaying && !effectiveIsAtBusStop;

  // Time of Day state & calculation
  const [timeOverride, setTimeOverride] = useState<'auto' | 'sunrise' | 'midday' | 'sunset' | 'midnight'>('auto');

  let trackProgressRatio = (duration && duration > 0) ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;
  if (timeOverride === 'sunrise') trackProgressRatio = 0.10;
  else if (timeOverride === 'midday') trackProgressRatio = 0.40;
  else if (timeOverride === 'sunset') trackProgressRatio = 0.72;
  else if (timeOverride === 'midnight') trackProgressRatio = 0.95;

  const tod = getTimeOfDayDetails(trackProgressRatio);

  // Scene Crossfade State for smooth environment transitions
  const [activeScene, setActiveScene] = useState<SceneConfig>(scene);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (scene.id !== activeScene.id) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setActiveScene(scene);
        setIsFading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [scene, activeScene]);

  // Unified animation state: single state dispatch per frame to guarantee 60fps on Android
  const [animState, setAnimState] = useState<{ dist: number; busStop: number }>({
    dist: 0,
    busStop: 140
  });

  const drivenDist = safeNum(animState.dist, 0);
  const busStopOffset = safeNum(animState.busStop, 140);

  // Mathematically derived parallax offsets (0 extra state hooks, zero GC overhead)
  const cloudOffset = (drivenDist * 0.01667) % 100;
  const farBgOffset = (drivenDist * 0.0444) % 100;
  const midBgOffset = (drivenDist * 0.1000) % 100;
  const midgroundOffset = (drivenDist * 0.2333) % 100;
  const groundOffset = (drivenDist * 0.4167) % 100;
  const roadOffset = (drivenDist * 0.6667) % 100;
  const nearFgOffset = (drivenDist * 0.8889) % 100;
  const straightOffset = (drivenDist * 0.01944) % 1;
  const vehicleOffset = ((drivenDist * 0.2778) % 260) - 80;
  const [eventTriggerToken, setEventTriggerToken] = useState<number>(0);

  const requestRef = useRef<number | null>(null);

  // Continuous Procedural Road Curve Function
  // Automatically follows explicit progression: STRAIGHT → CURVE → TURN → STRAIGHT
  const getRoadCurve = (dist: number) => {
    const d = safeNum(dist, 0);
    const cycleLen = 760; // Distance for full driving cycle
    const cycleCount = Math.floor(d / cycleLen);
    const p = (d % cycleLen) / cycleLen; // Progress [0, 1) in current cycle

    // Direction alternates every cycle: Even cycles turn right (+1), Odd cycles turn left (-1)
    const turnSign = cycleCount % 2 === 0 ? 1 : -1;

    let phase: 'STRAIGHT' | 'CURVE' | 'TURN' = 'STRAIGHT';
    let phaseLabel = 'STRAIGHT ROAD';
    let phaseIcon = '⬆️';
    let rawX = 0;
    let angleDeg = 0;

    if (p < 0.25) {
      // Phase 1: STRAIGHT ROAD (0% - 25%)
      phase = 'STRAIGHT';
      phaseLabel = 'STRAIGHT ROAD';
      phaseIcon = '⬆️';
      rawX = 0;
      angleDeg = 0;
    } else if (p < 0.42) {
      // Phase 2: CURVE (25% - 42% - Easing smoothly into turn)
      phase = 'CURVE';
      phaseLabel = turnSign > 0 ? 'CURVING RIGHT' : 'CURVING LEFT';
      phaseIcon = turnSign > 0 ? '↱' : '↰';

      const t = (p - 0.25) / (0.42 - 0.25);
      const smoothT = t * t * (3 - 2 * t);
      rawX = turnSign * smoothT * 190;
      angleDeg = turnSign * smoothT * 13;
    } else if (p < 0.72) {
      // Phase 3: TURN (42% - 72% - Full sweeping turn arc)
      phase = 'TURN';
      phaseLabel = turnSign > 0 ? 'TURNING RIGHT' : 'TURNING LEFT';
      phaseIcon = turnSign > 0 ? '↪️' : '↩️';

      const t = (p - 0.42) / (0.72 - 0.42);
      const arc = Math.sin(t * Math.PI);
      rawX = turnSign * (190 + arc * 65);
      angleDeg = turnSign * (17 + arc * 6);
    } else {
      // Phase 4: STRAIGHT (72% - 100% - Leveling back to straight center)
      phase = 'STRAIGHT';
      phaseLabel = 'LEVELING TO STRAIGHT';
      phaseIcon = '⬆️';

      const t = (p - 0.72) / (1.0 - 0.72);
      const smoothT = 1 - (t * t * (3 - 2 * t));
      rawX = turnSign * smoothT * 190;
      angleDeg = turnSign * smoothT * 17;
    }

    // Numerical derivative to find exact road tangent derivative
    const step = 0.5;
    const pA = ((d + step) % cycleLen) / cycleLen;
    const countA = Math.floor((d + step) / cycleLen);
    const signA = countA % 2 === 0 ? 1 : -1;
    let xA = 0;
    if (pA >= 0.25 && pA < 0.42) {
      const t = (pA - 0.25) / 0.17;
      xA = signA * (t * t * (3 - 2 * t)) * 190;
    } else if (pA >= 0.42 && pA < 0.72) {
      const t = (pA - 0.42) / 0.30;
      xA = signA * (190 + Math.sin(t * Math.PI) * 65);
    } else if (pA >= 0.72) {
      const t = (pA - 0.72) / 0.28;
      xA = signA * (1 - (t * t * (3 - 2 * t))) * 190;
    }

    const dx = (xA - rawX) / step;

    return {
      x: safeNum(rawX, 0),
      angle: safeNum(angleDeg, 0),
      dx,
      phase,
      phaseLabel,
      phaseIcon,
      turnSign,
      progress: p
    };
  };

  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time: number) => {
      let delta = (time - lastTime) / 1000;
      if (isNaN(delta) || delta <= 0 || delta > 0.1) {
        delta = 0.016;
      }
      lastTime = time;

      if (isMoving) {
        const speedMultiplier = journeySpeed === 'slow' ? 0.72 : journeySpeed === 'fast' ? 1.35 : 1.0;
        setAnimState((prev) => {
          const nextDist = safeNum(prev.dist) + 18.0 * speedMultiplier * delta;
          const nextStop = prev.busStop < 140 ? prev.busStop + 8 * speedMultiplier * delta : 140;
          return { dist: nextDist, busStop: nextStop };
        });
      } else if (effectiveIsAtBusStop) {
        // Smooth deceleration / halt at roadside bus stop
        setAnimState((prev) => {
          const nextStop = prev.busStop > 28 ? Math.max(28, prev.busStop - 12 * delta) : 28;
          return { ...prev, busStop: nextStop };
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isMoving, effectiveIsAtBusStop, journeySpeed]);

  const currentConfig = activeScene;

  // Active Road Curve metrics for bus position and steering
  const currentCurve = getRoadCurve(drivenDist);
  // Bus steering angle (front wheels turn smoothly into curve direction)
  const busSteerAngle = Math.max(-25, Math.min(25, currentCurve.angle * 1.25));
  // Bus body tilt / rotation angle along road tangent
  const busTiltAngle = currentCurve.angle * 0.55;
  // Continuous wheel spin angle proportional to driven distance
  const wheelRotation = (drivenDist * 28) % 360;

  // Camera view mode: 'straight' (forward perspective with rear bus) | 'side' (side view profile) | 'cabin' (interior cockpit view)
  const [userViewMode, setUserViewMode] = useState<'straight' | 'side' | 'cabin' | null>(null);

  // CSS Rain Effect Toggle State (Default ON when scene is rainy)
  const [isRainToggleOn, setIsRainToggleOn] = useState(true);

  // Mobile HUD collapse/expand state for unblocked driving view
  const [isMobileHudCollapsed, setIsMobileHudCollapsed] = useState(false);

  // Is scene set to rainy weather
  const isRainy = activeScene.id === 'rainy' || activeScene.ambientParticle === 'rain' || sceneType === 'rainy';

  // Bus speed state: speed is greater than 'slow' when moving at normal (60 km/h) or fast (90 km/h)
  const isSpeedGreaterThanSlow = isMoving && journeySpeed !== 'slow';
  // Wiper appears ONLY when scene is rainy AND speed is greater than 'slow'
  const shouldShowWiper = isRainy && isSpeedGreaterThanSlow && isRainToggleOn;

  // Effective view mode: defaults to propViewMode, or userViewMode, or based on sceneType
  const viewMode: ViewMode = userViewMode !== null 
    ? userViewMode 
    : (propViewMode !== undefined ? propViewMode : (sceneType === 'straight' ? 'straight' : 'side'));

  const handleViewChange = (v: ViewMode) => {
    setUserViewMode(v);
    onViewModeChange?.(v);
  };

  // Real-time speed calculation in km/h
  const currentSpeedKmH = !isMoving
    ? 0
    : journeySpeed === 'slow'
    ? 40
    : journeySpeed === 'fast'
    ? 90
    : 60;

  // Real-time active road status & upcoming curve phase
  const nextFeatureText = currentCurve.phaseLabel;
  const nextFeatureIcon = currentCurve.phaseIcon;

  // Ambient Color Temperature Shift & Bus Stop Overlay (High-performance GPU-friendly overlay)
  const renderTopDashboardHUD = () => (
    <>
      {/* VIEWPORT COLOR TEMPERATURE SHIFT OVERLAY (TRACK PROGRESS) */}
      <div
        className="fixed inset-0 pointer-events-none z-20 transition-all duration-700 ease-in-out"
        style={{
          background: tod.overlayBg
        }}
      />

      <BusStopOverlay
        isAtBusStop={effectiveIsAtBusStop}
        currentStopName={currentStopName}
        onResumeJourney={() => setManualHalt(false)}
      />
    </>
  );

  // ─────────────────────────────────────────────────────────────
  // 1. CABIN COCKPIT VIEW (Camera inside bus looking out windshield)
  // ─────────────────────────────────────────────────────────────
  if (viewMode === 'cabin') {
    const isRainy = currentConfig.id === 'rainy' || currentConfig.ambientParticle === 'rain';

    // Organic needle fluctuation based on road speed and engine vibration
    const needleJitter = isMoving
      ? Math.sin(drivenDist * 2.8) * 1.8 + Math.cos(drivenDist * 5.2) * 0.9
      : Math.sin(drivenDist * 1.5) * 0.35;

    const baseSpeedNeedle = isMoving
      ? (journeySpeed === 'fast' ? 70 : journeySpeed === 'slow' ? 22 : 45)
      : -55;
    const speedNeedleDeg = baseSpeedNeedle + needleJitter;

    const baseRpmNeedle = isMoving
      ? (journeySpeed === 'fast' ? 52 : journeySpeed === 'slow' ? 14 : 32)
      : -45;
    const rpmNeedleDeg = baseRpmNeedle + needleJitter * 1.25;

    // Subtle digital speedometer display fluctuation
    const targetKm = journeySpeed === 'fast' ? 90 : journeySpeed === 'slow' ? 45 : 72;
    const displayKm = isMoving
      ? Math.round(targetKm + Math.sin(drivenDist * 1.8) * 1.1)
      : 0;

    // Steering wheel micro vibration
    const steerVibe = isMoving ? Math.sin(drivenDist * 8.5) * 0.45 : 0;

    // Active turn signal indicators
    const isTurningLeft = (currentCurve.phase === 'CURVE' || currentCurve.phase === 'TURN') && currentCurve.turnSign < 0;
    const isTurningRight = (currentCurve.phase === 'CURVE' || currentCurve.phase === 'TURN') && currentCurve.turnSign > 0;

    return (
      <div className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
        {renderTopDashboardHUD()}

        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          {/* OUTDOOR WORLD THROUGH WINDSHIELD (Camera pans laterally and rotates smoothly as bus turns into curves) */}
          <div
            className="absolute inset-0 transition-transform duration-100 ease-out origin-bottom"
            style={{
              transform: `rotate(${-busTiltAngle * 0.95}deg) translateX(${-currentCurve.angle * 9.5 - currentCurve.x * 0.18}px) translateY(${Math.abs(busTiltAngle) * 0.55}px) scale(1.16)`
            }}
          >
            {/* Sky Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${currentConfig.skyGradient}`}>
              {/* Sun / Moon element */}
              {currentConfig.sunOrMoon === 'sunset-sun' && (
                <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-amber-300 via-orange-400 to-rose-500 shadow-[0_0_140px_rgba(251,146,60,0.95)] blur-[1px]" />
              )}
              {currentConfig.sunOrMoon === 'moon' && (
                <div className="absolute top-[22%] right-[22%] w-24 h-24 rounded-full bg-amber-100 shadow-[0_0_90px_rgba(254,240,138,0.9)]" />
              )}
              
              {/* Drifting Sky Clouds */}
              <div
                className="absolute inset-x-0 top-8 h-32 pointer-events-none opacity-75 flex space-x-32 gpu-layer"
                style={{ transform: `translate3d(-${cloudOffset % 50}%, 0, 0)` }}
              >
                {CABIN_CLOUD_INDICES.map((i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-44 h-12 bg-amber-100/40 rounded-full blur-[2px]" />
                    <div className="w-28 h-8 bg-amber-200/30 rounded-full blur-[2px] -mt-6 ml-10" />
                  </div>
                ))}
              </div>
            </div>

            {/* Horizon Mountain Ranges with Snow Caps */}
            <div className="absolute inset-x-0 top-[20%] h-[22%] pointer-events-none opacity-90">
              <svg className="w-full h-full" viewBox="0 0 1000 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cabinMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={currentConfig.mountainColor} />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>
                <path d="M 0 120 L 0 55 Q 120 10 260 65 T 520 40 Q 720 15 880 50 T 1000 45 L 1000 120 Z" fill="url(#cabinMountainGrad)" />
                <polygon points="110,14 130,22 100,28" fill="#f8fafc" opacity="0.85" />
                <polygon points="505,38 535,42 490,48" fill="#f8fafc" opacity="0.85" />
                <polygon points="705,17 735,24 685,32" fill="#f8fafc" opacity="0.85" />
                <path d="M 0 120 L 0 75 Q 180 35 380 85 T 780 65 Q 900 45 1000 70 L 1000 120 Z" fill="#020617" opacity="0.85" />
              </svg>
            </div>

            {/* EXPANSIVE 4-LANE EXPRESSWAY ROAD SURFACE OUTSIDE WINDSHIELD */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cabinRoadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#222c3d" />
                    <stop offset="25%" stopColor="#1a2332" />
                    <stop offset="60%" stopColor="#111827" />
                    <stop offset="100%" stopColor="#030712" />
                  </linearGradient>
                  <linearGradient id="cabinLeftGround" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#112a1d" />
                    <stop offset="100%" stopColor="#234a22" />
                  </linearGradient>
                  <linearGradient id="cabinRightGround" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#234a22" />
                    <stop offset="100%" stopColor="#112a1d" />
                  </linearGradient>
                  <linearGradient id="cabinGantryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#15803d" />
                    <stop offset="100%" stopColor="#064e3b" />
                  </linearGradient>
                  <linearGradient id="cabinRumbleRed" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                </defs>

                {(() => {
                  const slices = CABIN_ROAD_SLICES.map((i) => {
                    const t = i / (CABIN_ROAD_SLICES.length - 1);
                    const depth = Math.pow(t, 2.1);
                    const y = 280 + depth * 720;
                    const lookAheadDist = drivenDist + (1 - t) * 180;
                    const curve = getRoadCurve(lookAheadDist);
                    const roadWidth = 36 + depth * 1480;
                    const cx = 500 + curve.x * Math.pow(depth, 1.2);
                    return {
                      depth,
                      y,
                      cx,
                      roadWidth,
                      left: cx - roadWidth / 2,
                      right: cx + roadWidth / 2,
                      curve
                    };
                  });

                  const leftPoints = slices.map(s => `${s.left.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                  const rightPoints = [...slices].reverse().map(s => `${s.right.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                  const roadPath = `M ${leftPoints} L ${rightPoints} Z`;

                  // Outer Rumble Strip Paths
                  const leftRumbleOuter = slices.map(s => `${(s.left - 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                  const leftRumbleInner = [...slices].reverse().map(s => `${s.left.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                  const leftRumblePath = `M ${leftRumbleOuter} L ${leftRumbleInner} Z`;

                  const rightRumbleOuter = slices.map(s => `${(s.right + 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                  const rightRumbleInner = [...slices].reverse().map(s => `${s.right.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                  const rightRumblePath = `M ${rightRumbleOuter} L ${rightRumbleInner} Z`;

                  // Outer Guardrails
                  const leftGuardrailPoints = slices.map(s => `${(s.left - 22 * s.depth).toFixed(1)},${(s.y - 14 * s.depth).toFixed(1)}`).join(' L ');
                  const rightGuardrailPoints = slices.map(s => `${(s.right + 22 * s.depth).toFixed(1)},${(s.y - 14 * s.depth).toFixed(1)}`).join(' L ');

                  return (
                    <>
                      {/* Left & Right Terrain */}
                      <polygon points={`0,280 ${slices[0].left.toFixed(1)},280 ${slices[slices.length - 1].left.toFixed(1)},1000 -400,1000`} fill="url(#cabinLeftGround)" />
                      <polygon points={`1000,280 ${slices[0].right.toFixed(1)},280 ${slices[slices.length - 1].right.toFixed(1)},1000 1400,1000`} fill="url(#cabinRightGround)" />

                      {/* Asphalt Road */}
                      <path d={roadPath} fill="url(#cabinRoadGrad)" />
                      <path d={roadPath} fill="#000000" opacity="0.2" />

                      {/* Rumble Strips */}
                      <path d={leftRumblePath} fill="#e2e8f0" opacity="0.9" />
                      <path d={rightRumblePath} fill="#e2e8f0" opacity="0.9" />
                      {slices.map((s, idx) => {
                        if (idx % 2 === 0) return null;
                        const nextS = slices[idx + 1] || s;
                        const p1 = `${s.left.toFixed(1)},${s.y.toFixed(1)}`;
                        const p2 = `${(s.left - 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`;
                        const p3 = `${(nextS.left - 10 * nextS.depth).toFixed(1)},${nextS.y.toFixed(1)}`;
                        const p4 = `${nextS.left.toFixed(1)},${nextS.y.toFixed(1)}`;
                        return <polygon key={`c-l-rumble-${idx}`} points={`${p1} ${p2} ${p3} ${p4}`} fill="url(#cabinRumbleRed)" opacity="0.85" />;
                      })}
                      {slices.map((s, idx) => {
                        if (idx % 2 === 0) return null;
                        const nextS = slices[idx + 1] || s;
                        const p1 = `${s.right.toFixed(1)},${s.y.toFixed(1)}`;
                        const p2 = `${(s.right + 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`;
                        const p3 = `${(nextS.right + 10 * nextS.depth).toFixed(1)},${nextS.y.toFixed(1)}`;
                        const p4 = `${nextS.right.toFixed(1)},${nextS.y.toFixed(1)}`;
                        return <polygon key={`c-r-rumble-${idx}`} points={`${p1} ${p2} ${p3} ${p4}`} fill="url(#cabinRumbleRed)" opacity="0.85" />;
                      })}

                      {/* Guardrails */}
                      <path d={leftGuardrailPoints} stroke="#94a3b8" strokeWidth="3.5" fill="none" opacity="0.85" />
                      <path d={rightGuardrailPoints} stroke="#94a3b8" strokeWidth="3.5" fill="none" opacity="0.85" />

                      {/* Shoulder Lines */}
                      {(() => {
                        const leftSolidLine = slices.map(s => `${(s.cx - s.roadWidth * 0.44).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                        const rightSolidLine = slices.map(s => `${(s.cx + s.roadWidth * 0.44).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                        return (
                          <>
                            <path d={`M ${leftSolidLine}`} stroke="#f8fafc" strokeWidth="2.5" fill="none" opacity="0.95" />
                            <path d={`M ${rightSolidLine}`} stroke="#f8fafc" strokeWidth="2.5" fill="none" opacity="0.95" />
                          </>
                        );
                      })()}

                      {/* Center Double Yellow Lines */}
                      {(() => {
                        const leftYellowLine = slices.map(s => `${(s.cx - 3.5 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                        const rightYellowLine = slices.map(s => `${(s.cx + 3.5 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                        return (
                          <>
                            <path d={`M ${leftYellowLine}`} stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.95" />
                            <path d={`M ${rightYellowLine}`} stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.95" />
                          </>
                        );
                      })()}

                      {/* Cat's Eyes Reflectors */}
                      {CAT_EYE_INDICES.map((idx) => {
                        const t = ((idx / CAT_EYE_INDICES.length) + (safeNum(straightOffset) / CAT_EYE_INDICES.length)) % 1;
                        const depth = Math.pow(t, 2.2);
                        const y = safeNum(280 + depth * 720, 280);
                        const lookAheadDist = drivenDist + (1 - t) * 180;
                        const curve = getRoadCurve(lookAheadDist);
                        const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                        const rCircle = Math.max(0.8, safeNum(depth * 3.2, 0.8));
                        const opacity = depth < 0.04 ? depth / 0.04 : 1;
                        return (
                          <g key={`c-cat-${idx}`} opacity={safeNum(opacity, 1)}>
                            <circle cx={cx - 5 * depth} cy={y} r={rCircle} fill="#fef08a" />
                            <circle cx={cx + 5 * depth} cy={y} r={rCircle} fill="#fef08a" />
                          </g>
                        );
                      })}

                      {/* Dashed White Lane Separators (4-Lane Expressway Layout) */}
                      {LANE_DASH_INDICES.map((idx) => {
                        const t = ((idx / LANE_DASH_INDICES.length) + (safeNum(straightOffset) / LANE_DASH_INDICES.length)) % 1;
                        const depth = Math.pow(t, 2.3);
                        const y = safeNum(280 + depth * 720, 280);
                        const lookAheadDist = drivenDist + (1 - t) * 180;
                        const curve = getRoadCurve(lookAheadDist);
                        const roadWidth = safeNum(36 + depth * 1480, 36);
                        const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                        const w = Math.max(0.2, safeNum(1.8 + depth * 18, 1.8));
                        const h = Math.max(0.2, safeNum(5 + depth * 55, 5));
                        const opacity = depth < 0.04 ? depth / 0.04 : 1;

                        const xLeftLane = cx - roadWidth * 0.22;
                        const xRightLane = cx + roadWidth * 0.22;

                        return (
                          <g key={`c-dash-${idx}`} opacity={safeNum(opacity, 1)}>
                            <rect x={xLeftLane - w / 2} y={y} width={w} height={h} rx={w / 2} fill="#f8fafc" opacity="0.9" />
                            <rect x={xRightLane - w / 2} y={y} width={w} height={h} rx={w / 2} fill="#f8fafc" opacity="0.9" />
                          </g>
                        );
                      })}

                      {/* Overhead Green Highway Gantry Sign Board */}
                      {(() => {
                        const tG = (safeNum(straightOffset) * 0.4) % 1;
                        const depthG = Math.pow(tG, 2.1);
                        const lookAheadDist = drivenDist + (1 - depthG) * 180;
                        const curve = getRoadCurve(lookAheadDist);

                        const yGround = safeNum(280 + depthG * 720, 280);
                        const roadWidth = safeNum(36 + depthG * 1480, 36);
                        const cx = safeNum(500 + curve.x * Math.pow(depthG, 1.2), 500);

                        const scale = Math.max(0.001, safeNum(0.06 + depthG * 1.8, 0.06));
                        const opacityG = depthG < 0.04 ? depthG / 0.04 : depthG > 0.92 ? (1 - depthG) / 0.08 : 1;

                        return (
                          <g transform={`translate(${cx.toFixed(1)}, ${yGround.toFixed(1)}) scale(${scale.toFixed(3)})`} opacity={safeNum(opacityG, 1)}>
                            <rect x={-roadWidth * 0.52} y="-280" width="16" height="280" fill="#334155" />
                            <rect x={roadWidth * 0.52 - 16} y="-280" width="16" height="280" fill="#334155" />
                            <rect x={-roadWidth * 0.55} y="-310" width={roadWidth * 1.1} height="30" fill="#1e293b" rx="4" />
                            <line x1={-roadWidth * 0.55} y1="-295" x2={roadWidth * 0.55} y2="-295" stroke="#475569" strokeWidth="2" strokeDasharray="6,6" />
                            <rect x="-240" y="-420" width="480" height="110" rx="12" fill="url(#cabinGantryGrad)" stroke="#f8fafc" strokeWidth="5" />
                            <text x="0" y="-390" fill="#fef08a" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                              NATIONAL HIGHWAY NH-44
                            </text>
                            <line x1="-200" y1="-380" x2="200" y2="-380" stroke="#f8fafc" strokeWidth="2" />
                            <text x="-110" y="-352" fill="#ffffff" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
                              ⬅️ BENGALURU 120 KM
                            </text>
                            <text x="110" y="-352" fill="#ffffff" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
                              HYDERABAD 340 KM ➡️
                            </text>
                            <text x="0" y="-326" fill="#67e8f9" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
                              KEEP LEFT FOR HEAVY VEHICLES & BUSES
                            </text>
                          </g>
                        );
                      })()}

                      {/* Roadside Trees */}
                      {TREE_INDICES.map((idx) => {
                        const t = ((idx / TREE_INDICES.length) + (safeNum(straightOffset) / TREE_INDICES.length)) % 1;
                        const depth = Math.pow(t, 2.2);
                        const lookAheadDist = drivenDist + (1 - t) * 180;
                        const curve = getRoadCurve(lookAheadDist);
                        const roadWidth = safeNum(36 + depth * 1480, 36);
                        const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                        const x = safeNum(cx + roadWidth / 2 + 40 * depth);
                        const y = safeNum(280 + depth * 720, 280);
                        const scale = Math.max(0.001, safeNum(0.06 + depth * 1.8, 0.06));
                        const opacity = depth < 0.05 ? depth / 0.05 : 1;
                        return (
                          <g key={`c-tree-${idx}`} transform={`translate(${x}, ${y}) scale(${scale})`} opacity={safeNum(opacity, 1)}>
                            <circle cx="0" cy="-60" r="38" fill={currentConfig.treeColors[idx % currentConfig.treeColors.length]} />
                            <rect x="-6" y="-28" width="12" height="28" fill="#451a03" rx="2" />
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* REALISTIC BUS INTERIOR / COCKPIT FRAME & DASHBOARD          */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between">
            {/* Minimalist Top Windshield Frame (Completely Clear Windshield) */}
            <div className="w-full h-2 sm:h-3.5 bg-stone-950/90 border-b border-stone-800/60 shadow-md flex items-center justify-between px-3 z-30" />

            {/* Left & Right Windshield A-Pillars Frame */}
            <div className="absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-stone-950 via-stone-900 to-transparent z-25 border-r border-stone-800" />
            <div className="absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-stone-950 via-stone-900 to-transparent z-25 border-l border-stone-800" />

            {/* Glass Glare & Tint Band Overlay */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/80 via-slate-900/30 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none z-20" />

            {/* Raindrops & Wiper Animation (If Rainy & Rain Toggle is ON) */}
            {isRainy && isRainToggleOn && (
              <div className="absolute inset-0 z-22 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-sky-950/20" />
                {RAIN_STREAK_CABIN_INDICES.map((i) => {
                  const left = ((i * 11.3 + 2) % 98);
                  const delay = ((i * 0.17) % 1.4);
                  const duration = 0.45 + ((i * 0.13) % 0.35);
                  const opacity = 0.5 + ((i * 0.11) % 0.45);
                  return (
                    <div
                      key={`cabin-streak-${i}`}
                      className="css-rain-streak"
                      style={{
                        left: `${left}%`,
                        top: `-80px`,
                        animationDuration: `${duration}s`,
                        animationDelay: `${delay}s`,
                        opacity
                      }}
                    />
                  );
                })}

                {RAIN_DROP_CABIN_INDICES.map((i) => {
                  const left = ((i * 15.3 + 4) % 92);
                  const top = ((i * 21.7 + 8) % 82);
                  const size = 3 + ((i * 7) % 6);
                  const delay = (i * 0.29) % 3;
                  const isTrickle = i % 3 === 0;

                  if (isTrickle) {
                    return (
                      <div
                        key={`cabin-trickle-${i}`}
                        className="css-windshield-trickle"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          animationDelay: `${delay}s`
                        }}
                      />
                    );
                  }

                  return (
                    <div
                      key={`cabin-drop-${i}`}
                      className="css-windshield-droplet"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${size}px`,
                        height: `${size * 1.15}px`,
                        animationDelay: `${delay}s`
                      }}
                    />
                  );
                })}

                <WindshieldWiper isVisible={shouldShowWiper} journeySpeed={journeySpeed} />
              </div>
            )}

            {/* BOTTOM DASHBOARD COCKPIT & INSTRUMENT INSTRUMENTATION */}
            <div className="w-full bg-stone-950/95 border-t-2 sm:border-t-4 border-stone-800/80 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] px-2 sm:px-4 pt-2 sm:pt-3 pb-[54px] sm:pb-[62px] z-30 flex items-end justify-between short-screen-cockpit">
              {/* Driver Instrument Cluster (Speedometer, Tachometer, Turn Signals & Gauges) */}
              <div className="relative flex items-center space-x-1.5 sm:space-x-3 bg-stone-900/95 border sm:border-2 border-stone-700/90 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm animate-gauge-glow overflow-hidden short-screen-cluster mb-1 sm:mb-2">
                {/* Ambient Backlight Flicker Overlay */}
                <div className="absolute inset-0 bg-amber-500/5 animate-gauge-flicker pointer-events-none z-0" />

                {/* Flashing Left Turn Signal */}
                <div className={`relative z-10 text-xs sm:text-xl font-bold transition-all ${isTurningLeft ? 'text-emerald-400 animate-ping scale-125' : 'text-stone-700'}`}>
                  ◄
                </div>

                {/* Speedometer Dial */}
                <div className="relative z-10 w-16 h-16 sm:w-26 sm:h-26 rounded-full bg-stone-950 border sm:border-2 border-amber-500/90 flex items-center justify-center shadow-[inset_0_0_12px_rgba(245,158,11,0.3)] animate-gauge-flicker short-screen-speedometer">
                  <div className="text-[7px] sm:text-[9px] font-mono font-black text-amber-400 absolute top-1 sm:top-2">KM/H</div>
                  <div className="text-[9px] sm:text-xs font-mono font-bold text-amber-200 absolute bottom-1.5 sm:bottom-3">
                    {displayKm}
                  </div>
                  {/* Gauge Needle with Fluctuating Engine Jitter */}
                  <div
                    className="w-0.5 sm:w-1 h-6 sm:h-11 bg-rose-500 rounded-t-full origin-bottom shadow-md transition-transform duration-75 ease-out"
                    style={{ transform: `rotate(${speedNeedleDeg}deg)` }}
                  />
                  <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-stone-300 absolute border border-stone-600 shadow-sm" />
                </div>

                {/* Tachometer (RPM) Dial */}
                <div className="relative z-10 w-12 h-12 sm:w-22 sm:h-22 rounded-full bg-stone-950 border sm:border-2 border-slate-600 flex items-center justify-center shadow-[inset_0_0_10px_rgba(148,163,184,0.25)] hidden md:flex animate-gauge-flicker">
                  <div className="text-[6px] sm:text-[8px] font-mono font-black text-slate-400 absolute top-1">RPM</div>
                  <div
                    className="w-0.5 h-5 sm:h-9 bg-amber-400 rounded-t-full origin-bottom shadow-md transition-transform duration-75 ease-out"
                    style={{ transform: `rotate(${rpmNeedleDeg}deg)` }}
                  />
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-stone-400 absolute" />
                </div>

                {/* Flashing Right Turn Signal */}
                <div className={`relative z-10 text-xs sm:text-xl font-bold transition-all ${isTurningRight ? 'text-emerald-400 animate-ping scale-125' : 'text-stone-700'}`}>
                  ►
                </div>

                {/* Digital Trip Odometer & Air Pressure */}
                <div className="relative z-10 flex flex-col text-[8px] sm:text-[10px] font-mono text-amber-300/90 pl-1 border-l border-stone-800">
                  <span className="text-stone-400 text-[7px] sm:text-[8px]">TRIP</span>
                  <span className="text-[10px] sm:text-sm font-extrabold text-amber-400 animate-indicator-glow">
                    {(drivenDist / 8.0).toFixed(1)} KM
                  </span>
                  <span className="text-emerald-400 text-[7px] sm:text-[8px] mt-0.5 font-bold animate-indicator-glow hidden xs:inline">120 PSI</span>
                </div>
              </div>

              {/* HEAVY DUTY DRIVER STEERING WHEEL (Rotates dynamically as bus navigates curves with micro vibration) */}
              <div className="relative flex items-center justify-center mb-1 sm:mb-2">
                <div
                  className="w-28 h-28 sm:w-52 sm:h-52 rounded-full border-[10px] sm:border-[16px] border-stone-800 bg-transparent shadow-[0_0_35px_rgba(0,0,0,0.95)] flex items-center justify-center transition-transform duration-75 short-screen-steering"
                  style={{ transform: `rotate(${busSteerAngle * 2.8 + steerVibe}deg)` }}
                >
                  {/* Steering Spokes */}
                  <div className="w-full h-2 sm:h-4 bg-stone-800 absolute" />
                  <div className="w-2 sm:w-4 h-full bg-stone-800 absolute" />
                  {/* Central Steering Megaphone Horn */}
                  <div className="z-10 short-screen-horn">
                    <MegaphoneHorn size={48} hornVolume={0.85} showText={false} />
                  </div>
                </div>
              </div>

              {/* Dashboard Switches & Gear Selector */}
              <div className="hidden md:flex flex-col items-end text-xs font-mono text-amber-200/90 space-y-1.5">

                <div className="bg-stone-900 border border-amber-700/60 px-3 py-1.5 rounded-xl flex items-center space-x-2 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>CABIN MODE • FRONT WINDSHIELD</span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-stone-400 bg-stone-900/80 px-2.5 py-1 rounded-lg border border-stone-800">
                  <span>GEAR: <strong className="text-emerald-400">D (DRIVE)</strong></span>
                  <span>•</span>
                  <span>STOP: <strong className="text-amber-300">{currentStopName || currentConfig.stops[0].name}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. STRAIGHT ROAD PERSPECTIVE VIEW (Forward perspective with rear bus)
  // ─────────────────────────────────────────────────────────────
  if (viewMode === 'straight') {
    return (
      <div className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
        {renderTopDashboardHUD()}

        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>

          {/* Sky & Sunset Sun on Vanishing Horizon */}
          <div className={`absolute inset-0 bg-gradient-to-b ${currentConfig.skyGradient}`}>
            <div className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-amber-300 via-orange-400 to-rose-500 shadow-[0_0_140px_rgba(251,146,60,0.95)] blur-[1px]" />
            <div className="absolute top-[26%] inset-x-0 h-24 bg-gradient-to-t from-amber-500/30 via-orange-400/20 to-transparent pointer-events-none" />
            
            {/* Drifting Sky Clouds */}
            <div
              className="absolute inset-x-0 top-6 h-32 pointer-events-none opacity-75 flex space-x-32 gpu-layer"
              style={{ transform: `translate3d(-${cloudOffset % 50}%, 0, 0)` }}
            >
              {CABIN_CLOUD_INDICES.map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-44 h-12 bg-amber-100/40 rounded-full blur-[2px]" />
                  <div className="w-28 h-8 bg-amber-200/30 rounded-full blur-[2px] -mt-6 ml-10" />
                </div>
              ))}
            </div>
          </div>

          {/* Horizon Mountain Silhouette & Snow Peaks */}
          <div className="absolute inset-x-0 top-[12%] h-[18%] pointer-events-none opacity-85">
            <svg className="w-full h-full" viewBox="0 0 1000 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="perspMountainGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <linearGradient id="perspMountainGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>
              {/* Back Mountain Range */}
              <path d="M 0 120 L 0 55 Q 120 10 260 65 T 520 40 Q 720 15 880 50 T 1000 45 L 1000 120 Z" fill="url(#perspMountainGrad1)" />
              {/* Snow Caps */}
              <polygon points="110,14 130,22 100,28" fill="#f8fafc" opacity="0.85" />
              <polygon points="505,38 535,42 490,48" fill="#f8fafc" opacity="0.85" />
              <polygon points="705,17 735,24 685,32" fill="#f8fafc" opacity="0.85" />
              {/* Front Ridge Range */}
              <path d="M 0 120 L 0 75 Q 180 35 380 85 T 780 65 Q 900 45 1000 70 L 1000 120 Z" fill="url(#perspMountainGrad2)" opacity="0.9" />
            </svg>
          </div>

          {/* EXPANSIVE HIGHWAY PERSPECTIVE CANVAS (SVG Viewport: 1000 x 1000) */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <defs>
                <linearGradient id="straightRoadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#222c3d" />
                  <stop offset="25%" stopColor="#1a2332" />
                  <stop offset="60%" stopColor="#111827" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>
                <linearGradient id="straightLeftGround" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#112a1d" />
                  <stop offset="100%" stopColor="#234a22" />
                </linearGradient>
                <linearGradient id="straightRightGround" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#234a22" />
                  <stop offset="100%" stopColor="#112a1d" />
                </linearGradient>
                <linearGradient id="gantryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
                <linearGradient id="rumbleRed" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
              </defs>

              {/* Dynamic Curved Perspective Highway Surface and Environment */}
              {(() => {
                const slices = REAR_ROAD_SLICES.map((i) => {
                  const t = i / (REAR_ROAD_SLICES.length - 1); // 0 (horizon) to 1 (foreground)
                  const depth = Math.pow(t, 2.1);
                  const y = 280 + depth * 720; // High Horizon (280) occupying 72% height!
                  const lookAheadDist = drivenDist + (1 - t) * 180;
                  const curve = getRoadCurve(lookAheadDist);
                  const roadWidth = 36 + depth * 1480; // Expands wide into foreground!
                  const cx = 500 + curve.x * Math.pow(depth, 1.2);
                  return {
                    depth,
                    y,
                    cx,
                    roadWidth,
                    left: cx - roadWidth / 2,
                    right: cx + roadWidth / 2,
                    curve,
                    lookAheadDist
                  };
                });

                const leftPoints = slices.map(s => `${s.left.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                const rightPoints = [...slices].reverse().map(s => `${s.right.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                const roadPath = `M ${leftPoints} L ${rightPoints} Z`;

                // Outer Shoulder & Rumble Strip Paths
                const leftRumbleOuter = slices.map(s => `${(s.left - 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                const leftRumbleInner = [...slices].reverse().map(s => `${s.left.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                const leftRumblePath = `M ${leftRumbleOuter} L ${leftRumbleInner} Z`;

                const rightRumbleOuter = slices.map(s => `${(s.right + 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                const rightRumbleInner = [...slices].reverse().map(s => `${s.right.toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                const rightRumblePath = `M ${rightRumbleOuter} L ${rightRumbleInner} Z`;

                // Outer Steel Guardrails
                const leftGuardrailPoints = slices.map(s => `${(s.left - 22 * s.depth).toFixed(1)},${(s.y - 14 * s.depth).toFixed(1)}`).join(' L ');
                const rightGuardrailPoints = slices.map(s => `${(s.right + 22 * s.depth).toFixed(1)},${(s.y - 14 * s.depth).toFixed(1)}`).join(' L ');

                return (
                  <>
                    {/* Ground Left & Right Grass/Terrain Polygons */}
                    <polygon points={`0,280 ${slices[0].left.toFixed(1)},280 ${slices[slices.length - 1].left.toFixed(1)},1000 -400,1000`} fill="url(#straightLeftGround)" />
                    <polygon points={`1000,280 ${slices[0].right.toFixed(1)},280 ${slices[slices.length - 1].right.toFixed(1)},1000 1400,1000`} fill="url(#straightRightGround)" />

                    {/* Main Multi-Lane Asphalt Expressway Surface */}
                    <path d={roadPath} fill="url(#straightRoadGrad)" />

                    {/* Dark Worn Rubber Tire Tracks in Driving Lanes */}
                    <path d={roadPath} fill="#000000" opacity="0.22" />

                    {/* Red-White Concrete Rumble Strips on Outer Shoulder Edges */}
                    <path d={leftRumblePath} fill="#e2e8f0" opacity="0.9" />
                    <path d={rightRumblePath} fill="#e2e8f0" opacity="0.9" />
                    {slices.map((s, idx) => {
                      if (idx % 2 === 0) return null;
                      const nextS = slices[idx + 1] || s;
                      const p1 = `${s.left.toFixed(1)},${s.y.toFixed(1)}`;
                      const p2 = `${(s.left - 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`;
                      const p3 = `${(nextS.left - 10 * nextS.depth).toFixed(1)},${nextS.y.toFixed(1)}`;
                      const p4 = `${nextS.left.toFixed(1)},${nextS.y.toFixed(1)}`;
                      return <polygon key={`l-rumble-${idx}`} points={`${p1} ${p2} ${p3} ${p4}`} fill="url(#rumbleRed)" opacity="0.85" />;
                    })}
                    {slices.map((s, idx) => {
                      if (idx % 2 === 0) return null;
                      const nextS = slices[idx + 1] || s;
                      const p1 = `${s.right.toFixed(1)},${s.y.toFixed(1)}`;
                      const p2 = `${(s.right + 10 * s.depth).toFixed(1)},${s.y.toFixed(1)}`;
                      const p3 = `${(nextS.right + 10 * nextS.depth).toFixed(1)},${nextS.y.toFixed(1)}`;
                      const p4 = `${nextS.right.toFixed(1)},${nextS.y.toFixed(1)}`;
                      return <polygon key={`r-rumble-${idx}`} points={`${p1} ${p2} ${p3} ${p4}`} fill="url(#rumbleRed)" opacity="0.85" />;
                    })}

                    {/* Galvanized Steel Double-Beam Guardrails */}
                    <path d={leftGuardrailPoints} stroke="#94a3b8" strokeWidth="3.5" fill="none" opacity="0.85" />
                    <path d={rightGuardrailPoints} stroke="#94a3b8" strokeWidth="3.5" fill="none" opacity="0.85" />

                    {/* Continuous Solid White Outer Shoulder Lines */}
                    {(() => {
                      const leftSolidLine = slices.map(s => `${(s.cx - s.roadWidth * 0.44).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                      const rightSolidLine = slices.map(s => `${(s.cx + s.roadWidth * 0.44).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                      return (
                        <>
                          <path d={`M ${leftSolidLine}`} stroke="#f8fafc" strokeWidth="2.5" fill="none" opacity="0.95" />
                          <path d={`M ${rightSolidLine}`} stroke="#f8fafc" strokeWidth="2.5" fill="none" opacity="0.95" />
                        </>
                      );
                    })()}

                    {/* Center Double Yellow Barrier Lines & Cat's Eyes */}
                    {(() => {
                      const leftYellowLine = slices.map(s => `${(s.cx - 3.5 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                      const rightYellowLine = slices.map(s => `${(s.cx + 3.5 * s.depth).toFixed(1)},${s.y.toFixed(1)}`).join(' L ');
                      return (
                        <>
                          <path d={`M ${leftYellowLine}`} stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.95" />
                          <path d={`M ${rightYellowLine}`} stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.95" />
                        </>
                      );
                    })()}

                    {/* Central Median Cat's Eye Reflectors */}
                    {CAT_EYE_INDICES.map((idx) => {
                      const t = ((idx / CAT_EYE_INDICES.length) + (safeNum(straightOffset) / CAT_EYE_INDICES.length)) % 1;
                      const depth = Math.pow(t, 2.2);
                      const y = safeNum(280 + depth * 720, 280);
                      const lookAheadDist = drivenDist + (1 - t) * 180;
                      const curve = getRoadCurve(lookAheadDist);
                      const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                      const rCircle = Math.max(0.8, safeNum(depth * 3.2, 0.8));
                      const opacity = depth < 0.04 ? depth / 0.04 : 1;
                      return (
                        <g key={`cat-${idx}`} opacity={safeNum(opacity, 1)}>
                          <circle cx={cx - 5 * depth} cy={y} r={rCircle} fill="#fef08a" />
                          <circle cx={cx + 5 * depth} cy={y} r={rCircle} fill="#fef08a" />
                        </g>
                      );
                    })}

                    {/* Left & Right Lane Dashed White Lines (4-Lane Expressway Layout) */}
                    {LANE_DASH_INDICES.map((idx) => {
                      const t = ((idx / LANE_DASH_INDICES.length) + (safeNum(straightOffset) / LANE_DASH_INDICES.length)) % 1;
                      const depth = Math.pow(t, 2.3);
                      const y = safeNum(280 + depth * 720, 280);
                      const lookAheadDist = drivenDist + (1 - t) * 180;
                      const curve = getRoadCurve(lookAheadDist);
                      const roadWidth = safeNum(36 + depth * 1480, 36);
                      const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                      const w = Math.max(0.2, safeNum(1.8 + depth * 18, 1.8));
                      const h = Math.max(0.2, safeNum(5 + depth * 55, 5));
                      const opacity = depth < 0.04 ? depth / 0.04 : 1;

                      // Left Lane Separator (divides lane 1 and lane 2)
                      const xLeftLane = cx - roadWidth * 0.22;
                      // Right Lane Separator (divides lane 3 and lane 4)
                      const xRightLane = cx + roadWidth * 0.22;

                      return (
                        <g key={`dash-${idx}`} opacity={safeNum(opacity, 1)}>
                          <rect x={xLeftLane - w / 2} y={y} width={w} height={h} rx={w / 2} fill="#f8fafc" opacity="0.9" />
                          <rect x={xRightLane - w / 2} y={y} width={w} height={h} rx={w / 2} fill="#f8fafc" opacity="0.9" />
                        </g>
                      );
                    })}

                    {/* Overhead Green Highway Sign Gantry (NH-44 Expressway) */}
                    {(() => {
                      const tG = (safeNum(straightOffset) * 0.4) % 1;
                      const depthG = Math.pow(tG, 2.1);
                      const lookAheadDist = drivenDist + (1 - depthG) * 180;
                      const curve = getRoadCurve(lookAheadDist);

                      const yGround = safeNum(280 + depthG * 720, 280);
                      const roadWidth = safeNum(36 + depthG * 1480, 36);
                      const cx = safeNum(500 + curve.x * Math.pow(depthG, 1.2), 500);

                      const scale = Math.max(0.001, safeNum(0.06 + depthG * 1.8, 0.06));
                      const opacityG = depthG < 0.04 ? depthG / 0.04 : depthG > 0.92 ? (1 - depthG) / 0.08 : 1;

                      return (
                        <g transform={`translate(${cx.toFixed(1)}, ${yGround.toFixed(1)}) scale(${scale.toFixed(3)})`} opacity={safeNum(opacityG, 1)}>
                          {/* Gantry Steel Posts */}
                          <rect x={-roadWidth * 0.52} y="-280" width="16" height="280" fill="#334155" />
                          <rect x={roadWidth * 0.52 - 16} y="-280" width="16" height="280" fill="#334155" />

                          {/* Horizontal Cross Truss */}
                          <rect x={-roadWidth * 0.55} y="-310" width={roadWidth * 1.1} height="30" fill="#1e293b" rx="4" />
                          <line x1={-roadWidth * 0.55} y1="-295" x2={roadWidth * 0.55} y2="-295" stroke="#475569" strokeWidth="2" strokeDasharray="6,6" />

                          {/* Large Green Overhead Highway Board */}
                          <rect x="-240" y="-420" width="480" height="110" rx="12" fill="url(#gantryGrad)" stroke="#f8fafc" strokeWidth="5" />

                          {/* Board Header & Route */}
                          <text x="0" y="-390" fill="#fef08a" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                            NATIONAL HIGHWAY NH-44
                          </text>
                          <line x1="-200" y1="-380" x2="200" y2="-380" stroke="#f8fafc" strokeWidth="2" />

                          {/* Dest / Lane Directions */}
                          <text x="-110" y="-352" fill="#ffffff" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
                            ⬅️ BENGALURU 120 KM
                          </text>
                          <text x="110" y="-352" fill="#ffffff" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
                            HYDERABAD 340 KM ➡️
                          </text>
                          <text x="0" y="-326" fill="#67e8f9" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
                            KEEP LEFT FOR HEAVY VEHICLES & BUSES
                          </text>
                        </g>
                      );
                    })()}

                    {/* Tall Cobra-Head Highway Light Posts with Soft Glow */}
                    {REAR_LAMP_INDICES.map((idx) => {
                      const t = ((idx / REAR_LAMP_INDICES.length) + (safeNum(straightOffset) / REAR_LAMP_INDICES.length)) % 1;
                      const depth = Math.pow(t, 2.1);
                      const lookAheadDist = drivenDist + (1 - t) * 180;
                      const curve = getRoadCurve(lookAheadDist);
                      const roadWidth = safeNum(36 + depth * 1480, 36);
                      const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                      const isLeft = idx % 2 === 0;
                      const xPost = isLeft ? cx - roadWidth * 0.53 : cx + roadWidth * 0.53;
                      const yPost = safeNum(280 + depth * 720, 280);
                      const scale = Math.max(0.001, safeNum(0.06 + depth * 1.7, 0.06));
                      const opacity = depth < 0.05 ? depth / 0.05 : 1;

                      return (
                        <g key={`lamp-${idx}`} transform={`translate(${xPost.toFixed(1)}, ${yPost.toFixed(1)}) scale(${scale.toFixed(3)})`} opacity={safeNum(opacity, 1)}>
                          {/* Ground Light Cone on Asphalt */}
                          <ellipse cx={isLeft ? "120" : "-120"} cy="0" rx="90" ry="25" fill="#fef08a" opacity="0.18" />

                          {/* Tall Steel Pole */}
                          <line x1="0" y1="0" x2="0" y2="-260" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
                          {/* Curved Cobra Arm */}
                          <path d={isLeft ? "M 0 -260 C 20 -280 80 -290 120 -280" : "M 0 -260 C -20 -280 -80 -290 -120 -280"} stroke="#334155" strokeWidth="6" fill="none" />
                          {/* Cobra Fixture Head */}
                          <circle cx={isLeft ? "120" : "-120"} cy="-280" r="12" fill="#fef08a" />
                          <circle cx={isLeft ? "120" : "-120"} cy="-280" r="22" fill="#fef08a" opacity="0.4" />
                        </g>
                      );
                    })}

                    {/* Catenary Electric Wires Connecting Left Utility Poles */}
                    {(() => {
                      const poleCoords = REAR_POLE_INDICES.map((idx) => {
                        const t = ((idx / REAR_POLE_INDICES.length) + (safeNum(straightOffset) / REAR_POLE_INDICES.length)) % 1;
                        const depth = Math.pow(t, 2.1);
                        const lookAheadDist = drivenDist + (1 - t) * 180;
                        const curve = getRoadCurve(lookAheadDist);
                        const roadWidth = safeNum(36 + depth * 1480, 36);
                        const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                        const x = safeNum(cx - roadWidth / 2 - 35 * depth);
                        const y = safeNum(280 + depth * 720 - 110 * (0.06 + depth * 1.6), 280);
                        return { x, y, depth, t };
                      }).sort((a, b) => a.t - b.t);

                      const wirePath = poleCoords.reduce((acc, p, i) => {
                        if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
                        const prev = poleCoords[i - 1];
                        const mx = (prev.x + p.x) / 2;
                        const my = (prev.y + p.y) / 2 + 7 * p.depth;
                        if (isNaN(mx) || isNaN(my) || isNaN(p.x) || isNaN(p.y)) return acc;
                        return `${acc} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
                      }, '');

                      return <path d={wirePath} stroke="#64748b" strokeWidth="1.2" fill="none" opacity="0.65" />;
                    })()}

                    {/* Left Utility Power Poles along Perspective Curve */}
                    {REAR_POLE_INDICES.map((idx) => {
                      const t = ((idx / REAR_POLE_INDICES.length) + (safeNum(straightOffset) / REAR_POLE_INDICES.length)) % 1;
                      const depth = Math.pow(t, 2.1);
                      const lookAheadDist = drivenDist + (1 - t) * 180;
                      const curve = getRoadCurve(lookAheadDist);
                      const roadWidth = safeNum(36 + depth * 1480, 36);
                      const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                      const x = safeNum(cx - roadWidth / 2 - 35 * depth);
                      const y = safeNum(280 + depth * 720, 280);
                      const scale = Math.max(0.001, safeNum(0.06 + depth * 1.6, 0.06));
                      const opacity = depth < 0.05 ? depth / 0.05 : 1;
                      return (
                        <g key={idx} transform={`translate(${x}, ${y}) scale(${scale})`} opacity={safeNum(opacity, 1)}>
                          <line x1="0" y1="0" x2="0" y2="-120" stroke="#451a03" strokeWidth="12" strokeLinecap="round" />
                          <line x1="-35" y1="-100" x2="35" y2="-100" stroke="#78350f" strokeWidth="8" strokeLinecap="round" />
                          <circle cx="-30" cy="-105" r="4" fill="#fbbf24" />
                          <circle cx="30" cy="-105" r="4" fill="#fbbf24" />
                        </g>
                      );
                    })}

                    {/* Roadside Warning Signs on Right Shoulder */}
                    {REAR_SIGN_INDICES.map((idx) => {
                      const t = ((idx / REAR_SIGN_INDICES.length) + (safeNum(straightOffset) / REAR_SIGN_INDICES.length) + 0.12) % 1;
                      const depth = Math.pow(t, 2.1);
                      const lookAheadDist = drivenDist + (1 - t) * 180;
                      const curve = getRoadCurve(lookAheadDist);
                      const roadWidth = safeNum(36 + depth * 1480, 36);
                      const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                      const x = safeNum(cx + roadWidth / 2 + 25 * depth);
                      const y = safeNum(280 + depth * 720, 280);
                      const scale = Math.max(0.001, safeNum(0.06 + depth * 1.5, 0.06));
                      const opacity = depth < 0.05 ? depth / 0.05 : 1;
                      const signType = idx % 2;

                      return (
                        <g key={idx} transform={`translate(${x}, ${y}) scale(${scale})`} opacity={safeNum(opacity, 1)}>
                          <line x1="0" y1="0" x2="0" y2="-70" stroke="#475569" strokeWidth="6" />
                          {signType === 0 ? (
                            <g transform="translate(0, -95)">
                              <polygon points="0,-35 -30,20 30,20" fill="#f59e0b" stroke="#78350f" strokeWidth="4" />
                              <path d="M -10 10 Q 0 -15 12 -5" stroke="#000000" strokeWidth="5" fill="none" strokeLinecap="round" />
                            </g>
                          ) : (
                            <g transform="translate(0, -95)">
                              <circle cx="0" cy="0" r="28" fill="#ffffff" stroke="#dc2626" strokeWidth="6" />
                              <text x="0" y="8" fill="#000000" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">80</text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Right Trees & Foliage along Highway Scenery */}
                    {TREE_INDICES.map((idx) => {
                      const t = ((idx / TREE_INDICES.length) + (safeNum(straightOffset) / TREE_INDICES.length)) % 1;
                      const depth = Math.pow(t, 2.1);
                      const lookAheadDist = drivenDist + (1 - t) * 180;
                      const curve = getRoadCurve(lookAheadDist);
                      const roadWidth = safeNum(36 + depth * 1480, 36);
                      const cx = safeNum(500 + curve.x * Math.pow(depth, 1.2), 500);
                      const x = safeNum(cx + roadWidth / 2 + 45 * depth);
                      const y = safeNum(280 + depth * 720, 280);
                      const scale = Math.max(0.001, safeNum(0.06 + depth * 1.6, 0.06));
                      const opacity = depth < 0.05 ? depth / 0.05 : 1;
                      return (
                        <g key={idx} transform={`translate(${x}, ${y}) scale(${scale})`} opacity={safeNum(opacity, 1)}>
                          <rect x="-8" y="-40" width="16" height="40" fill="#451a03" />
                          <circle cx="0" cy="-80" r="40" fill={currentConfig.treeColors[idx % currentConfig.treeColors.length]} />
                          <circle cx="-20" cy="-65" r="30" fill={currentConfig.treeColors[(idx + 1) % currentConfig.treeColors.length]} />
                          <circle cx="20" cy="-65" r="30" fill={currentConfig.treeColors[(idx + 2) % currentConfig.treeColors.length]} />
                        </g>
                      );
                    })}
                  </>
                );
              })()}

              {/* Highway Milestone Marker Zooming Past on Right Shoulder */}
              {(() => {
                const tM = (safeNum(straightOffset) * 1.5) % 1;
                const depthM = Math.pow(tM, 2.1);
                const xM = safeNum(500 + depthM * 480, 500);
                const yM = safeNum(280 + depthM * 720, 280);
                const scaleM = Math.max(0.001, safeNum(0.05 + depthM * 1.4, 0.05));
                const opacityM = depthM < 0.05 ? depthM / 0.05 : 1;
                return (
                  <g transform={`translate(${xM}, ${yM}) scale(${scaleM})`} opacity={safeNum(opacityM, 1)}>
                    <path d="M -20 -40 L -20 -10 C -20 0 20 0 20 -10 L 20 -40 Z" fill="#fef08a" stroke="#78350f" strokeWidth="3" />
                    <rect x="-20" y="-70" width="40" height="30" rx="15" fill="#f59e0b" stroke="#78350f" strokeWidth="3" />
                    <text x="0" y="-52" fill="#451a03" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">NH44</text>
                  </g>
                );
              })()}

              {/* Realistic Highway Side Billboard */}
              {(() => {
                const tG = (safeNum(straightOffset) * 0.5) % 1;
                const depthG = Math.pow(tG, 2.1);
                const lookAheadDist = drivenDist + (1 - depthG) * 180;
                const curve = getRoadCurve(lookAheadDist);

                const yGround = safeNum(280 + depthG * 720, 280);
                const roadWidth = safeNum(36 + depthG * 1480, 36);
                const cx = safeNum(500 + curve.x * Math.pow(depthG, 1.2), 500);

                const xPole = cx - roadWidth / 2 - 50 * depthG - 30;

                const scale = Math.max(0.001, safeNum(0.07 + depthG * 1.7, 0.07));
                const opacityG = depthG < 0.04 ? depthG / 0.04 : depthG > 0.92 ? (1 - depthG) / 0.08 : 1;

                const msgIdx = Math.floor((drivenDist / 180) % 4);
                const ads = [
                  {
                    header: "NH-44 EXPRESSWAY",
                    title: "SAFAR LO-FI RADIO",
                    sub: "100.8 FM • RETRO HIGHWAY VIBES",
                    footer: "FEEL THE MUSIC • DRIVE SAFE",
                    bg: "#1e3a8a"
                  },
                  {
                    header: "WELCOME TO HIGHWAY",
                    title: "GARDEN CITY 45 KM",
                    sub: "EXPRESSWAY ROUTE",
                    footer: "DRIVE SLOW • ENJOY THE SCENERY",
                    bg: "#15803d"
                  },
                  {
                    header: "HIGHWAY DHABA & CHAI",
                    title: "FRESH TIF-IN & COFFEE",
                    sub: "NEXT EXIT 2 KM • OPEN 24/7",
                    footer: "HOT TEA • LO-FI LOUNGE • PARKING",
                    bg: "#b45309"
                  },
                  {
                    header: "NOSTALGIC EXPRESS",
                    title: "HORN OK PLEASE",
                    sub: "BUS RADIO 1982 • LIVE",
                    footer: "SAFE JOURNEY TO ALL DRIVERS",
                    bg: "#6b21a8"
                  }
                ];
                const ad = ads[msgIdx];

                return (
                  <g transform={`translate(${xPole.toFixed(1)}, ${yGround.toFixed(1)}) scale(${scale.toFixed(3)})`} opacity={safeNum(opacityG, 1)}>
                    {/* Ground Shadow */}
                    <ellipse cx="0" cy="5" rx="35" ry="8" fill="#000000" opacity="0.3" />

                    {/* Main Steel Monopole Support Column */}
                    <rect x="-10" y="-220" width="20" height="220" fill="#1e293b" rx="2" />
                    <rect x="-8" y="-220" width="5" height="220" fill="#334155" />

                    {/* Ladder on Right Side */}
                    <line x1="10" y1="0" x2="10" y2="-210" stroke="#475569" strokeWidth="2.5" />
                    <line x1="18" y1="0" x2="18" y2="-210" stroke="#475569" strokeWidth="2.5" />
                    {Array.from({ length: 14 }).map((_, i) => (
                      <line key={i} x1="10" y1={-i * 15} x2="18" y2={-i * 15} stroke="#64748b" strokeWidth="2" />
                    ))}

                    {/* Diagonal Brackets */}
                    <line x1="-90" y1="-218" x2="-10" y2="-170" stroke="#475569" strokeWidth="4" />
                    <line x1="90" y1="-218" x2="10" y2="-170" stroke="#475569" strokeWidth="4" />

                    {/* Maintenance Platform */}
                    <rect x="-120" y="-228" width="240" height="10" fill="#334155" rx="2" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="-120" y1="-223" x2="120" y2="-223" stroke="#64748b" strokeWidth="1" strokeDasharray="3,3" />

                    {/* Billboard Panel */}
                    <rect x="-135" y="-355" width="270" height="125" rx="10" fill="#334155" stroke="#1e293b" strokeWidth="4" />
                    <rect x="-130" y="-350" width="260" height="115" rx="7" fill="#ffffff" />
                    <rect x="-126" y="-346" width="252" height="107" rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

                    {/* Header */}
                    <rect x="-126" y="-346" width="252" height="30" rx="4" fill={ad.bg} />
                    <text x="0" y="-326" fill="#ffffff" fontSize="14" fontWeight="900" textAnchor="middle" fontFamily="sans-serif" letterSpacing="1">
                      {ad.header}
                    </text>

                    {/* Headline */}
                    <text x="0" y="-296" fill="#0f172a" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                      {ad.title}
                    </text>

                    {/* Subtitle */}
                    <text x="0" y="-278" fill="#2563eb" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
                      {ad.sub}
                    </text>

                    <line x1="-90" y1="-264" x2="90" y2="-264" stroke="#cbd5e1" strokeWidth="1.5" />

                    {/* Footer */}
                    <text x="0" y="-248" fill="#475569" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
                      {ad.footer}
                    </text>

                    {/* Spotlights */}
                    {[-75, 0, 75].map((xOff, idx) => (
                      <g key={idx} transform={`translate(${xOff}, -355)`}>
                        <path d="M 0 0 C -2 -12 -6 -18 -12 -22" stroke="#1e293b" strokeWidth="3.5" fill="none" />
                        <ellipse cx="-12" cy="-22" rx="7" ry="3.5" fill="#0f172a" />
                        <path d="M -18 -20 L -6 -20 L -2 -13 L -22 -13 Z" fill="#334155" />
                        <polygon points="-20,-13 -4,-13 15,35 -30,35" fill="#fef08a" opacity="0.22" />
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Roadside Bus Stop Shelter in Straight View Mode when at bus stop */}
          {isAtBusStop && (
            <div className="absolute top-[38%] right-[12%] z-25 flex flex-col items-center animate-bounce">
              <div className="bg-amber-950/90 text-amber-100 border-2 border-amber-600 px-4 py-2 rounded-xl shadow-2xl flex flex-col items-center">
                <div className="flex items-center space-x-2 text-sm font-black text-amber-400 font-serif">
                  <span>🚏</span>
                  <span className="tracking-wide uppercase">{currentStopName || currentConfig.stops[0].name}</span>
                </div>
                <span className="text-[10px] text-amber-300/80 font-mono mt-0.5">{currentConfig.stops[0].tagline}</span>
              </div>
              <div className="w-2 h-16 bg-amber-950 border-x border-amber-800" />
            </div>
          )}

          {/* Ambient Sunset Glow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 via-rose-500/10 to-transparent pointer-events-none z-20 mix-blend-color-dodge" />
          <div className="absolute inset-0 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,23,0.65)_100%)]" />
        </div>

        {/* AUTOMATICALLY STEERING REAR-VIEW BUS FOLLOWING ROAD CURVE */}
        <div
          className="absolute bottom-[48px] sm:bottom-[56px] left-1/2 w-[98vw] sm:w-[480px] md:w-[540px] h-[48vh] sm:h-[50vh] md:h-[52vh] max-h-[580px] z-30 pointer-events-none flex flex-col items-center justify-end transition-all duration-100 ease-out"
          style={{
            transform: `translateX(calc(-50% + ${currentCurve.x * 0.75}px)) rotate(${-currentCurve.angle * 0.35}deg)`
          }}
        >
          {/* Ground shadow beneath bus tires */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[88%] h-3 bg-slate-950/80 rounded-full blur-[3px] pointer-events-none z-0" />

        {/* LOUDSPEAKER MEGAPHONE HORN MOUNTED JUST UP FROM BUS TOP */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -top-8 sm:-top-11 z-40 flex items-center pointer-events-auto"
          title="Tap Horn to Honk (Rooftop Red Megaphone Horn)"
        >
          <MegaphoneHorn size={52} hornVolume={0.85} showText={true} />
        </div>

          <svg
            viewBox="0 0 320 280"
            preserveAspectRatio="xMidYMax meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`w-full h-full z-10 transition-transform duration-75 ${
              isMoving ? 'translate-y-[0.8px]' : ''
            }`}
          >
            <defs>
              <linearGradient id="rearBusBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="25%" stopColor="#0284c7" />
                <stop offset="70%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="rearGoldStripe" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="rearWindowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.10" />
              </linearGradient>
            </defs>

            {/* Dual Rear Tires with Animated Rotating Wheel Hubs */}
            <g>
              <rect x="36" y="222" width="48" height="32" rx="8" fill="#020617" stroke="#334155" strokeWidth="2" />
              {/* Left Rear Wheel Alloy Spokes */}
              <g style={{ transformOrigin: '60px 238px', transform: `rotate(${wheelRotation}deg)` }}>
                <circle cx="60" cy="238" r="9" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="3,3" />
                <circle cx="60" cy="238" r="4" fill="#94a3b8" />
              </g>

              <rect x="236" y="222" width="48" height="32" rx="8" fill="#020617" stroke="#334155" strokeWidth="2" />
              {/* Right Rear Wheel Alloy Spokes */}
              <g style={{ transformOrigin: '260px 238px', transform: `rotate(${wheelRotation}deg)` }}>
                <circle cx="260" cy="238" r="9" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="3,3" />
                <circle cx="260" cy="238" r="4" fill="#94a3b8" />
              </g>
            </g>

            {/* Front Steering Wheels Visible Underneath Chassis Pivoting with Road Curves */}
            <g>
              {/* Left Front Wheel Pivot */}
              <g transform={`rotate(${busSteerAngle}, 64, 218)`}>
                <rect x="52" y="206" width="24" height="24" rx="5" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                <line x1="64" y1="206" x2="64" y2="230" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2,2" />
              </g>
              {/* Right Front Wheel Pivot */}
              <g transform={`rotate(${busSteerAngle}, 256, 218)`}>
                <rect x="244" y="206" width="24" height="24" rx="5" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                <line x1="256" y1="206" x2="256" y2="230" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2,2" />
              </g>
            </g>

            {/* Mudflaps with Diagonal Stripes */}
            <g>
              <path d="M 38 238 L 28 268 L 86 268 L 82 238 Z" fill="#0f172a" stroke="#020617" strokeWidth="2" />
              <line x1="38" y1="262" x2="48" y2="242" stroke="#f8fafc" strokeWidth="2.5" />
              <line x1="56" y1="262" x2="66" y2="242" stroke="#f8fafc" strokeWidth="2.5" />
              <line x1="74" y1="262" x2="84" y2="242" stroke="#f8fafc" strokeWidth="2.5" />

              <path d="M 238 238 L 234 268 L 292 268 L 282 238 Z" fill="#0f172a" stroke="#020617" strokeWidth="2" />
              <line x1="240" y1="262" x2="250" y2="242" stroke="#f8fafc" strokeWidth="2.5" />
              <line x1="258" y1="262" x2="268" y2="242" stroke="#f8fafc" strokeWidth="2.5" />
              <line x1="276" y1="262" x2="286" y2="242" stroke="#f8fafc" strokeWidth="2.5" />
            </g>

            {/* Main Body Shell */}
            <path
              d="M 24 235 L 24 55 C 24 30 42 16 75 16 L 245 16 C 278 16 296 30 296 55 L 296 235 Z"
              fill="url(#rearBusBody)"
              stroke="#0f172a"
              strokeWidth="3"
            />

            {/* Roof Luggage Rack & Tarpaulin Covered Luggage */}
            <g>
              <rect x="45" y="8" width="230" height="10" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
              <path d="M 60 10 Q 110 -2 160 10 Q 210 -2 260 10 Z" fill="#d97706" />
              <path d="M 75 8 L 85 -1 L 115 -1 L 125 8 Z" fill="#b45309" />
              <path d="M 195 8 L 205 0 L 235 0 L 245 8 Z" fill="#0284c7" />
              <line x1="90" y1="8" x2="90" y2="-1" stroke="#fef08a" strokeWidth="1.5" />
              <line x1="110" y1="8" x2="110" y2="-1" stroke="#fef08a" strokeWidth="1.5" />
              <line x1="210" y1="8" x2="210" y2="0" stroke="#fef08a" strokeWidth="1.5" />
              <line x1="230" y1="8" x2="230" y2="0" stroke="#fef08a" strokeWidth="1.5" />
            </g>

            {/* Ladder on Left Rear */}
            <g>
              <line x1="42" y1="45" x2="42" y2="225" stroke="#94a3b8" strokeWidth="3" />
              <line x1="56" y1="45" x2="56" y2="225" stroke="#94a3b8" strokeWidth="3" />
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={i} x1="42" y1={60 + i * 20} x2="56" y2={60 + i * 20} stroke="#cbd5e1" strokeWidth="2.5" />
              ))}
            </g>

            {/* Destination Sign Banner at Top Center */}
            <rect x="90" y="24" width="140" height="18" rx="4" fill="#000000" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="160" y="36" fill="#fbbf24" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              STRAIGHT ROAD EXPRESS
            </text>

            {/* Large Rear Glass Windshield */}
            <g>
              <rect x="70" y="48" width="180" height="75" rx="6" fill="#0f172a" />
              <circle cx="110" cy="80" r="9" fill="#d97706" />
              <path d="M 98 123 C 98 96 122 96 122 123 Z" fill="#0284c7" />
              
              <circle cx="210" cy="82" r="9.5" fill="#f59e0b" />
              <path d="M 196 123 C 196 98 224 98 224 123 Z" fill="#15803d" />

              <rect x="70" y="48" width="180" height="75" rx="6" fill="url(#rearWindowGrad)" stroke="#1e293b" strokeWidth="2.5" />
              <path d="M 85 49 L 115 49 L 90 122 L 75 122 Z" fill="#ffffff" opacity="0.12" />
              <path d="M 160 49 L 190 49 L 165 122 L 150 122 Z" fill="#ffffff" opacity="0.12" />
            </g>

            {/* Gold Accent Stripe */}
            <rect x="24" y="132" width="272" height="20" fill="url(#rearGoldStripe)" />

            {/* ICONIC HAND-PAINTED INDIAN BUS SLOGAN */}
            <g>
              <rect x="70" y="158" width="180" height="28" rx="6" fill="#991b1b" stroke="#fef08a" strokeWidth="1.5" />
              <text x="160" y="177" fill="#fef08a" fontSize="13" fontFamily="serif" fontWeight="900" textAnchor="middle" letterSpacing="1">
                🎺 HORN OK PLEASE
              </text>
            </g>

            {/* License Plate & Safety Badges */}
            <g>
              <rect x="120" y="192" width="80" height="16" rx="3" fill="#fef08a" stroke="#000000" strokeWidth="1.5" />
              <text x="160" y="204" fill="#000000" fontSize="10" fontFamily="monospace" fontWeight="black" textAnchor="middle">
                KA 01 F 1982
              </text>

              <circle cx="85" cy="200" r="10" fill="#ffffff" stroke="#dc2626" strokeWidth="2" />
              <text x="85" y="203.5" fill="#000000" fontSize="8" fontFamily="monospace" fontWeight="black" textAnchor="middle">
                60
              </text>

              <rect x="215" y="193" width="50" height="14" rx="2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
              <text x="240" y="203" fill="#f8fafc" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                KEEP DIST
              </text>
            </g>

            {/* Glowing Red Taillights */}
            <g>
              <rect x="30" y="180" width="18" height="34" rx="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
              <rect x="32" y="182" width="14" height="14" rx="2" fill="#fef08a" opacity="0.9" />
              <circle cx="39" cy="204" r="5" fill="#f97316" />

              <rect x="272" y="180" width="18" height="34" rx="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
              <rect x="274" y="182" width="14" height="14" rx="2" fill="#fef08a" opacity="0.9" />
              <circle cx="281" cy="204" r="5" fill="#f97316" />
            </g>

            {/* Exhaust Pipe with Animated Smoke Puffs */}
            <rect x="282" y="222" width="8" height="14" rx="2" fill="#475569" />
            {isMoving && (
              <g className="animate-pulse">
                <circle cx="294" cy="220" r="5" fill="#cbd5e1" opacity="0.5" />
                <circle cx="302" cy="212" r="7" fill="#cbd5e1" opacity="0.3" />
                <circle cx="310" cy="202" r="9" fill="#cbd5e1" opacity="0.15" />
              </g>
            )}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
      {renderTopDashboardHUD()}
      {/* ─────────────────────────────────────────────────────────── */}
      {/* SCENE CONTAINER WITH SMOOTH CROSSFADE FADE                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 0: SKY GRADIENT, MOON/SUN & DRIFTING CLOUDS           */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className={`absolute inset-0 bg-gradient-to-b ${currentConfig.skyGradient} transition-colors duration-1000`}>
          {/* Moon for Night Scene */}
          {currentConfig.sunOrMoon === 'moon' && (
            <div className="absolute top-12 right-24 sm:right-36">
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-slate-100 shadow-[0_0_80px_rgba(255,255,255,0.9)] flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-slate-300/40 absolute top-4 left-6" />
                <div className="w-6 h-6 rounded-full bg-slate-300/30 absolute bottom-5 right-6" />
              </div>
              {/* Twinkling Stars */}
              {Array.from({ length: 24 }).map((_, idx) => (
                <div
                  key={idx}
                  className="absolute rounded-full bg-white animate-pulse"
                  style={{
                    width: `${(idx % 3) + 1.5}px`,
                    height: `${(idx % 3) + 1.5}px`,
                    top: `-${(idx * 17) % 120}px`,
                    left: `${(idx * 29) % 320 - 150}px`,
                    animationDuration: `${2 + (idx % 4)}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Sun or Sunset Sun */}
          {currentConfig.sunOrMoon === 'sun' && (
            <div className="absolute top-10 right-28 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#ff5500] shadow-[0_0_60px_rgba(255,85,0,0.7)]" />
          )}
          {currentConfig.sunOrMoon === 'sunset-sun' && (
            <div className="absolute top-16 right-32 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 shadow-[0_0_90px_rgba(249,115,22,0.85)]" />
          )}
          {currentConfig.sunOrMoon === 'rain-cloud' && (
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-950/90 via-slate-900/70 to-transparent pointer-events-none" />
          )}

          {/* Parallax Slow Clouds */}
          <div
            className="absolute inset-x-0 top-8 h-28 pointer-events-none opacity-60 flex space-x-40 gpu-layer"
            style={{ transform: `translate3d(-${cloudOffset % 50}%, 0, 0)` }}
          >
            {CABIN_CLOUD_INDICES.map((i) => (
              <div key={i} className="flex flex-col items-center opacity-80">
                <div className="w-32 h-10 bg-white/70 rounded-full blur-[1px] shadow-sm" />
                <div className="w-20 h-8 bg-white/60 rounded-full blur-[1px] -mt-5 ml-8" />
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 1: FAR BACKGROUND (MOUNTAINS WITH SNOW CAPS ~0.8x delta) */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="absolute inset-x-0 bottom-[30%] h-60 overflow-hidden pointer-events-none parallax-container">
          <svg
            className="w-[200%] h-full transition-colors duration-1000 opacity-90 gpu-layer"
            style={{ transform: `translate3d(-${farBgOffset % 50}%, 0, 0)` }}
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sideMountainGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={currentConfig.mountainColor} />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
            </defs>
            {/* Multi-peaked mountain backdrop */}
            <path
              d="M 0 200 L 0 80 Q 150 15, 300 95 T 600 85 Q 750 10, 900 95 T 1200 85 L 1200 200 Z"
              fill="url(#sideMountainGrad1)"
            />
            {/* Mountain Snow Caps */}
            <polygon points="140,28 165,45 120,50" fill="#f8fafc" opacity="0.8" />
            <polygon points="740,20 770,38 720,44" fill="#f8fafc" opacity="0.8" />
            <polygon points="1040,32 1070,48 1020,52" fill="#f8fafc" opacity="0.8" />
          </svg>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 2: MID-BACKGROUND (SECONDARY HILLS ~1.8x delta)       */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="absolute inset-x-0 bottom-[26%] h-48 overflow-hidden pointer-events-none opacity-80 parallax-container">
          <svg
            className="w-[200%] h-full transition-colors duration-1000 gpu-layer"
            style={{ transform: `translate3d(-${midBgOffset % 50}%, 0, 0)` }}
            viewBox="0 0 1200 150"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 150 L 0 65 Q 180 20, 360 85 T 720 65 Q 900 15, 1080 85 T 1200 70 L 1200 150 Z"
              fill={currentConfig.mountainColor}
              opacity="0.9"
            />
          </svg>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 3: MIDGROUND (POLES WITH CABLES, SIGNS, TREES ~0.5x)   */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="absolute inset-x-0 bottom-[22%] h-52 overflow-hidden pointer-events-none z-10 parallax-container">
          {/* Continuous Sagging Electric Cables between Utility Poles */}
          <div
            className="w-[300%] h-12 absolute top-4 left-0 transition-colors duration-1000 gpu-layer"
            style={{ transform: `translate3d(-${midgroundOffset % 33.33}%, 0, 0)` }}
          >
            <svg className="w-full h-full" viewBox="0 0 1800 50" preserveAspectRatio="none">
              {SIDE_POLE_INDICES.map((idx) => {
                const x1 = idx * 128 + 20;
                const x2 = (idx + 1) * 128 + 20;
                const xm = (x1 + x2) / 2;
                return (
                  <path
                    key={idx}
                    d={`M ${x1} 10 Q ${xm} 38 ${x2} 10`}
                    stroke="#475569"
                    strokeWidth="1.2"
                    fill="none"
                    opacity="0.6"
                  />
                );
              })}
            </svg>
          </div>

          <div
            className="flex w-[300%] h-full items-end justify-between transition-colors duration-1000 gpu-layer"
            style={{ transform: `translate3d(-${midgroundOffset % 33.33}%, 0, 0)` }}
          >
            {SIDE_POLE_INDICES.map((i) => (
              <div key={i} className="flex items-end space-x-12">
                {/* Electric Pole / Streetlight */}
                <div className="relative flex flex-col items-center">
                  <div className="w-2 h-36 bg-stone-800" />
                  <div className="absolute top-2 w-16 h-1.5 bg-stone-700 rounded" />
                  <div className="absolute top-6 w-14 h-1 bg-stone-700 rounded" />
                  {/* Streetlight Glow for Night Mode */}
                  {currentConfig.id === 'night' && (
                    <div className="absolute top-2 right-0 w-12 h-20 bg-gradient-to-b from-amber-200/50 to-transparent blur-[6px] transform rotate-12" />
                  )}
                </div>

                {/* Roadside Warning & Direction Signs */}
                {i % 3 === 1 && (
                  <div className="relative mb-2 flex flex-col items-center">
                    <div className="w-1.5 h-16 bg-slate-700" />
                    {i % 6 === 1 ? (
                      // Speed Limit 60
                      <div className="absolute -top-3 w-8 h-8 rounded-full bg-white border-2 border-red-600 flex items-center justify-center text-[9px] font-black text-black shadow-md">
                        60
                      </div>
                    ) : (
                      // Sharp Curve Warning Triangle
                      <div className="absolute -top-4 w-9 h-8 bg-amber-400 [clip-path:polygon(50%_0%,0%_100%,100%_100%)] border border-amber-800 flex items-center justify-center text-[10px] font-extrabold text-black pt-1 shadow-md">
                        ↱
                      </div>
                    )}
                  </div>
                )}

                {/* Overhead Green Highway Gantry Signboard */}
                {i % 7 === 3 && (
                  <div className="relative mb-0 flex flex-col items-center">
                    <div className="w-32 h-10 bg-emerald-800 border-2 border-white rounded p-1 flex flex-col items-center justify-center text-[8px] font-bold text-white shadow-xl font-serif">
                      <span>NH-44 EXPRESSWAY</span>
                      <span className="text-amber-300 font-mono text-[7px]">SHIMLA 25 KM • OOTY 80 KM</span>
                    </div>
                    <div className="w-2 h-24 bg-slate-700" />
                  </div>
                )}

                {/* Scenic Trees */}
                <div className="relative flex flex-col items-center">
                  <div
                    className="w-14 h-28 sm:w-16 sm:h-32 rounded-full shadow-lg"
                    style={{
                      backgroundColor: currentConfig.treeColors[i % currentConfig.treeColors.length]
                    }}
                  />
                  <div className="w-3.5 h-12 bg-amber-950/90 rounded-b" />
                </div>

                {/* Village Chai Dhaba or Rest Stop */}
                {i % 4 === 0 && (
                  <div className="relative mb-0 bg-amber-950 text-amber-100 p-2.5 rounded-t-lg text-[10px] font-bold border-t-2 border-amber-600 shadow-xl flex flex-col items-center">
                    <div className="w-16 h-10 bg-amber-100/90 rounded-sm border border-amber-900/40 p-1 flex justify-between">
                      <div className="w-4 h-4 bg-amber-900/60 rounded-xs" />
                      <div className="w-4 h-4 bg-amber-900/60 rounded-xs" />
                    </div>
                    <span className="bg-rose-800 px-2 py-0.5 rounded text-[8px] text-amber-100 mt-1 uppercase tracking-wider font-mono">
                      ☕ CHAI DHABA
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 4: GROUND STRIP, ROAD SHOULDER & MILESTONES (~7.5x)   */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-[48px] sm:bottom-[54px] h-[24%] transition-colors duration-1000 border-t border-stone-700 z-15 overflow-hidden parallax-container"
          style={{ backgroundColor: currentConfig.groundColor }}
        >
          {/* Roadside Shoulder Grass/Gravel Texture Line */}
          <div className="w-full h-1.5 bg-amber-900/50 border-b border-amber-800/40" />

          {/* Roadside Milestone Marker */}
          <div
            className="absolute top-1.5 h-12 w-8 bg-amber-100 border-2 border-amber-900 rounded-t-full flex flex-col items-center justify-center text-[9px] font-black text-amber-950 shadow-md pointer-events-none gpu-layer"
            style={{
              transform: `translate3d(${(100 - (groundOffset * 2.2) % 130)}vw, 0, 0)`
            }}
          >
            <div className="w-full bg-amber-400 text-center text-[8px] font-black rounded-t-full border-b border-amber-900">
              NH44
            </div>
            <span>15 KM</span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 5: HIGHWAY ROAD SURFACE & CONTINUOUS LANE MARKINGS    */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-[48px] sm:bottom-[54px] h-[19%] border-t-2 border-stone-900 flex flex-col justify-between py-1 overflow-hidden transition-colors duration-1000 z-20 shadow-2xl parallax-container"
          style={{
            backgroundColor: currentConfig.roadColor,
            backgroundImage: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.5), rgba(2, 6, 23, 0.85))'
          }}
        >
          {/* Top Concrete Rumble Strip / Curb with Red & White Hazard Blocks (High Performance repeating gradient) */}
          <div
            className="w-full h-1.5 shrink-0 opacity-90"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 16px, #f8fafc 16px, #f8fafc 32px)'
            }}
          />

          {/* Top Solid White Shoulder Line */}
          <div className="w-full h-[2px] bg-slate-200/90 shadow-xs opacity-90" />

          {/* Periodic Highway Junction Branch Connections & Asphalt Turn Arrows */}
          <div
            className="w-[200%] h-full absolute inset-0 pointer-events-none flex items-center justify-around opacity-90 gpu-layer"
            style={{ transform: `translate3d(-${(roadOffset % 100) / 2}%, 0, 0)` }}
          >
            {[0, 1].map((blockIdx) => (
              <div key={blockIdx} className="w-[100%] h-full flex items-center justify-around shrink-0">
                {/* Intersection Junction Branch Opening */}
                <div className="relative w-28 h-full bg-slate-800/80 border-x-2 border-dashed border-amber-400/80 flex items-center justify-center">
                  <span className="text-[10px] text-amber-300 font-extrabold tracking-widest font-mono">
                    ➜ SH-12
                  </span>
                </div>
                {/* Standard Road Segment */}
                <div className="w-64 h-full flex items-center justify-center">
                  <span className="text-slate-400/20 text-xs font-black">➜ ➜ ➜</span>
                </div>
              </div>
            ))}
          </div>

          {/* Center Double Dashed Highway Line + Reflective Cat's Eye Studs (Seamless Loop) */}
          <div className="relative w-full h-3.5 flex items-center overflow-hidden z-10">
            <div
              className="w-[200%] h-full flex shrink-0 gpu-layer"
              style={{ transform: `translate3d(-${(roadOffset % 100) / 2}%, 0, 0)` }}
            >
              {[0, 1].map((blockIdx) => (
                <div key={blockIdx} className="w-[100%] h-full flex items-center justify-around shrink-0 px-2">
                  {SIDE_DASH_INDICES.map((dashIdx) => (
                    <div key={dashIdx} className="relative flex items-center shrink-0 space-x-1">
                      {/* Reflective Cat's Eye Stud */}
                      <div className="w-2 h-2 bg-amber-200 border border-amber-600 rounded-xs shadow-[0_0_5px_rgba(254,240,138,0.95)]" />
                      {/* Main Yellow Highway Dash */}
                      <div className="w-14 sm:w-20 h-2.5 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
                      {/* Secondary Cat's Eye Stud */}
                      <div className="w-2 h-2 bg-amber-200 border border-amber-600 rounded-xs shadow-[0_0_5px_rgba(254,240,138,0.95)]" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Solid White Shoulder Line */}
          <div className="w-full h-[2px] bg-slate-200/90 shadow-xs opacity-90" />

          {/* Rainy wet asphalt sheen overlay */}
          {currentConfig.id === 'rainy' && (
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-400/25 via-sky-300/10 to-transparent pointer-events-none" />
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 6: PASSING VEHICLES & BUS STOP                        */}
        {/* ─────────────────────────────────────────────────────────── */}
        {isMoving && (
          <div
            className="absolute bottom-[calc(10%+48px)] sm:bottom-[calc(10%+54px)] h-12 z-25 pointer-events-none gpu-layer"
            style={{ left: `${100 - vehicleOffset}%` }}
          >
            <div className="relative flex items-end">
              <div className="bg-rose-700 text-amber-100 text-[8px] font-black px-2 py-1 rounded-l border border-rose-900 shadow">
                <span>🚛 HORN OK PLEASE</span>
              </div>
              <div className="w-10 h-10 bg-amber-500 rounded-r border border-amber-800 flex items-center justify-center">
                <div className="w-3 h-3 bg-sky-200 border border-amber-900" />
              </div>
            </div>
          </div>
        )}

        {/* Roadside Bus Stop (Approaches naturally when track finishes) */}
        <div
          className="absolute bottom-[calc(14%+48px)] sm:bottom-[calc(14%+54px)] z-25 transition-all duration-300 pointer-events-none flex flex-col items-center gpu-layer"
          style={{ left: `${busStopOffset}%` }}
        >
          <div className="bg-amber-950/90 text-amber-100 border-2 border-amber-600/90 px-4 py-2 rounded-xl shadow-2xl flex flex-col items-center">
            <div className="flex items-center space-x-2 text-sm font-black text-amber-400 font-serif">
              <span>🚏</span>
              <span className="tracking-wide uppercase">
                {currentStopName || currentConfig.stops[0].name}
              </span>
            </div>
            <span className="text-[10px] text-amber-300/80 font-mono mt-0.5">
              {currentConfig.stops[0].tagline}
            </span>
          </div>
          <div className="w-2.5 h-20 bg-amber-950 border-x border-amber-800 shadow-xl" />
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* LAYER 7: ROADSIDE GUARDRAILS & CURB DELINEATORS (~16.0x)    */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="absolute inset-x-0 bottom-[48px] sm:bottom-[54px] h-5 overflow-hidden pointer-events-none z-35 parallax-container">
          {/* Continuous Guardrail Beam & Delineator Posts (Seamless Loop) */}
          <div
            className="w-[200%] h-full flex shrink-0 gpu-layer"
            style={{ transform: `translate3d(-${(nearFgOffset % 100) / 2}%, 0, 0)` }}
          >
            {[0, 1].map((blockIdx) => (
              <div key={blockIdx} className="w-[100%] h-full flex items-center justify-around shrink-0 px-2">
                {SIDE_POST_INDICES.map((idx) => (
                  <div key={idx} className="flex items-center space-x-1.5 opacity-85 shrink-0">
                    {/* Delineator Post with Orange Reflector */}
                    <div className="relative w-2 h-5 bg-amber-400 rounded-t shadow-md flex flex-col items-center justify-start pt-0.5">
                      <div className="w-1.5 h-1.5 bg-amber-900 rounded-xs" />
                    </div>
                    {/* Galvanized Steel Guardrail Beam */}
                    <div className="w-12 sm:w-16 h-1.5 bg-stone-300 border-y border-stone-500 shadow-sm" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM ROAD BED ASPHALT FILLER (Behind bottom control bar) */}
        <div className="absolute inset-x-0 bottom-0 h-[48px] sm:h-[54px] bg-stone-950/95 border-t border-stone-800 z-10" />

        {/* ─────────────────────────────────────────────────────────── */}
        {/* WEATHER OVERLAYS                                           */}
        {/* ─────────────────────────────────────────────────────────── */}
        {isRainy && isRainToggleOn && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {/* Cascading CSS Rain Streaks */}
            {RAIN_STREAK_SIDE_INDICES.map((i) => {
              const left = ((i * 9.3) % 100);
              const delay = ((i * 0.19) % 1.2);
              const duration = 0.5 + ((i * 0.13) % 0.35);
              const opacity = 0.45 + ((i * 0.15) % 0.45);
              return (
                <div
                  key={`scene-streak-${i}`}
                  className="css-rain-streak"
                  style={{
                    left: `${left}%`,
                    top: `-80px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    opacity
                  }}
                />
              );
            })}

            {/* Lens Water Droplets */}
            {RAIN_STREAK_SIDE_INDICES.map((i) => {
              const left = ((i * 19.3 + 8) % 88);
              const top = ((i * 27.1 + 12) % 82);
              const size = 4 + ((i * 5) % 7);
              const delay = (i * 0.4) % 3;
              return (
                <div
                  key={`scene-drop-${i}`}
                  className="css-windshield-droplet"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${size}px`,
                    height: `${size * 1.15}px`,
                    animationDelay: `${delay}s`
                  }}
                />
              );
            })}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-sky-950/20 to-transparent" />
          </div>
        )}

        {currentConfig.ambientParticle === 'fog' && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-slate-800/10 to-transparent pointer-events-none z-40 backdrop-blur-[0.5px]" />
        )}

        {currentConfig.ambientParticle === 'sunset-glow' && (
          <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 via-rose-500/10 to-transparent pointer-events-none z-40 mix-blend-color-dodge" />
        )}

        {/* CINEMATIC FILM VIGNETTE & SOFT HORIZON GRADIENT */}
        <div className="absolute inset-0 pointer-events-none z-45 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,23,0.65)_100%)]" />

        {/* RANDOM ROADSIDE / AIR ANIMATED EVENTS OVERLAY */}
        <RandomEventsOverlay
          isMoving={isMoving}
          isNight={sceneType.includes('night')}
          externalTriggerToken={eventTriggerToken}
        />
      </div>

      {/* FOREGROUND OBJECT: PROPORTIONALLY ENLARGED BUS STRAIGHT & GROUNDED ON ROAD */}
      <div
        className="absolute bottom-[48px] sm:bottom-[54px] left-1/2 w-[96vw] sm:w-[72vw] md:w-[60vw] max-w-[1200px] h-[45vh] sm:h-[48vh] md:h-[52vh] max-h-[620px] z-30 pointer-events-none flex flex-col items-center justify-end transition-all duration-75 ease-out"
        style={{
          transform: `translateX(-50%)`
        }}
      >
        {/* Soft Oval Overall Chassis Ground Shadow directly underneath bus wheels */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[92%] h-3 bg-stone-950/80 rounded-full blur-[3px] pointer-events-none z-0" />

        {/* LOUDSPEAKER MEGAPHONE HORN MOUNTED JUST UP FROM BUS TOP */}
        <div 
          className="absolute left-[24%] sm:left-[30%] md:left-[35%] -top-7 sm:-top-9 md:-top-12 z-40 flex items-center pointer-events-auto"
          title="Tap Horn to Honk (Rooftop Red Megaphone Horn)"
        >
          <MegaphoneHorn size={54} hornVolume={0.85} showText={true} />
        </div>

        {/* 2D Vector Blue Express Bus (Scaled Proportionally, Placed Directly On Road) */}
        <svg
          viewBox="0 0 460 198"
          preserveAspectRatio="xMidYMax meet"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full z-10 transition-transform duration-75 ${
            isMoving ? 'translate-y-[0.8px]' : ''
          }`}
        >
          <defs>
            {/* Rich Metallic Royal Blue Gradient */}
            <linearGradient id="busBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="20%" stopColor="#0284c7" />
              <stop offset="55%" stopColor="#2563eb" />
              <stop offset="85%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>
            {/* Vibrant Gold Racing Stripe */}
            <linearGradient id="goldStripeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            {/* Glass Reflection Gradient - Translucent Tinted Glass */}
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.10" />
            </linearGradient>
            {/* Interior Cabin Lighting Gradient */}
            <linearGradient id="interiorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            {/* Subtle Body Metallic Sheen */}
            <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
            {/* Headlight Beam Road Projection Gradient */}
            <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Headlight Beam Cone onto Asphalt (Night / Rainy / Sunset) */}
          <polygon points="440,122 580,110 620,180 440,140" fill="url(#headlightBeam)" opacity={currentConfig.id === 'night' || currentConfig.id === 'rainy' ? 0.8 : 0.25} />

          {/* Tire Contact Shadows directly on asphalt surface */}
          <ellipse cx="112" cy="195" rx="42" ry="3.5" fill="#020617" opacity="0.85" />
          <ellipse cx="332" cy="195" rx="42" ry="3.5" fill="#020617" opacity="0.85" />
          <ellipse cx="222" cy="194" rx="200" ry="4" fill="#020617" opacity="0.5" />

          {/* Main Upper Body */}
          <path
            d="M 15 155 L 15 42 C 15 26 30 14 48 14 L 388 14 C 424 14 448 34 448 72 L 448 155 L 15 155 Z"
            fill="url(#busBodyGrad)"
          />

          {/* Natural Roof Contour Highlight */}
          <path
            d="M 48 16 L 388 16 C 418 16 440 32 443 65"
            stroke="#bae6fd"
            strokeWidth="2"
            opacity="0.45"
            fill="none"
          />

          {/* Under-Window Recessed Ambient Shadow */}
          <rect x="15" y="109" width="433" height="7" fill="#030712" opacity="0.3" />

          {/* Golden Amber Accent Racing Line */}
          <path
            d="M 15 116 L 448 116 L 448 125 L 15 125 Z"
            fill="url(#goldStripeGrad)"
          />

          {/* Metallic Sheen Highlight on Gold Stripe */}
          <path
            d="M 15 116 L 448 116 L 448 120 L 15 120 Z"
            fill="url(#sheenGrad)"
          />

          {/* Deep Midnight Indigo Lower Skirt */}
          <path
            d="M 15 142 L 448 142 L 448 155 L 15 155 Z"
            fill="#0f172a"
          />

          {/* Top Front LED Destination Display Banner */}
          <rect x="348" y="20" width="88" height="15" rx="3" fill="#000000" stroke="#334155" strokeWidth="1" />
          <text x="392" y="31" fill="#fb923c" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            BUS WALA TRACK
          </text>

          {/* Front Windshield Window & Bus Driver */}
          <g>
            <defs>
              <clipPath id="windshieldClip">
                <path d="M 360 22 L 392 22 C 414 22 436 38 438 62 L 438 108 L 360 108 Z" />
              </clipPath>
            </defs>

            {/* Windshield Interior Background */}
            <path
              d="M 360 22 L 392 22 C 414 22 436 38 438 62 L 438 108 L 360 108 Z"
              fill="url(#interiorGrad)"
            />

            {/* Clipped Driver & Cabin Elements */}
            <g clipPath="url(#windshieldClip)">
              {/* Driver Seat Back */}
              <rect x="376" y="46" width="16" height="62" rx="3" fill="#0f172a" />
              {/* Bus Driver Figure */}
              <circle cx="396" cy="51" r="8" fill="#d97706" />
              {/* Driver Cap */}
              <path d="M 387 47 C 387 41 405 41 405 47 Z" fill="#0f172a" />
              <path d="M 385 47 L 407 47 L 409 50 L 385 50 Z" fill="#f59e0b" />
              {/* Driver Shirt / Torso */}
              <path d="M 384 108 C 384 72 412 72 412 108 Z" fill="#0284c7" />
              {/* Steering Wheel */}
              <ellipse cx="412" cy="74" rx="11" ry="6" stroke="#e2e8f0" strokeWidth="2.5" fill="none" transform="rotate(-15 412 74)" />
              <line x1="404" y1="74" x2="420" y2="74" stroke="#e2e8f0" strokeWidth="2" />
            </g>

            {/* Glass Overlay */}
            <path
              d="M 360 22 L 392 22 C 414 22 436 38 438 62 L 438 108 L 360 108 Z"
              fill="url(#glassGrad)"
            />
            {/* Glass Glare Stripes */}
            <path d="M 374 23 L 390 23 L 366 107 L 360 107 Z" fill="#ffffff" opacity="0.12" />
            <path d="M 400 23 L 416 23 L 392 107 L 378 107 Z" fill="#ffffff" opacity="0.12" />
            {/* Window Rubber Frame Trim */}
            <path
              d="M 360 22 L 392 22 C 414 22 436 38 438 62 L 438 108 L 360 108 Z"
              stroke="#0f172a"
              strokeWidth="2.5"
            />
          </g>

          {/* 5 Wide Panorama Side Windows with Seated Passengers */}
          {[
            // Window 0: Cozy traveler with headphones & warm mustard sweater
            {
              type: 'single',
              passenger1: {
                offset: 12,
                sweater: '#d97706',
                skin: '#f59e0b',
                hair: '#0f172a',
                accessory: 'headphones',
                prop: 'chai',
              },
            },
            // Window 1: Two passengers (Student in green hoodie + Elderly gentleman reading book)
            {
              type: 'double',
              passenger1: {
                offset: 4,
                sweater: '#15803d',
                skin: '#e0a96d',
                hair: '#0f172a',
                accessory: 'none',
                prop: 'none',
              },
              passenger2: {
                offset: 28,
                sweater: '#0d9488',
                skin: '#d97706',
                hair: '#e2e8f0',
                accessory: 'glasses',
                prop: 'book',
              },
            },
            // Window 2: Woman in crimson sweater with dark hair looking out window
            {
              type: 'single',
              passenger1: {
                offset: 16,
                sweater: '#be123c',
                skin: '#f59e0b',
                hair: '#020617',
                accessory: 'scarf',
                prop: 'none',
              },
            },
            // Window 3: Two passengers (Traveler with purple neck pillow + Indigo hoodie with orange beanie)
            {
              type: 'double',
              passenger1: {
                offset: 4,
                sweater: '#ca8a04',
                skin: '#f59e0b',
                hair: '#1e293b',
                accessory: 'neckpillow',
                prop: 'none',
              },
              passenger2: {
                offset: 28,
                sweater: '#4338ca',
                skin: '#e0a96d',
                hair: '#f97316',
                accessory: 'beanie',
                prop: 'none',
              },
            },
            // Window 4: Traveler in terracotta sweater looking forward
            {
              type: 'single',
              passenger1: {
                offset: 14,
                sweater: '#c2410c',
                skin: '#f59e0b',
                hair: '#1e293b',
                accessory: 'none',
                prop: 'none',
              },
            },
          ].map((winConfig, idx) => {
            const x = 32 + idx * 64;
            const clipId = `winClip_${idx}`;
            return (
              <g key={idx}>
                <defs>
                  <clipPath id={clipId}>
                    <rect x={x} y="22" width="56" height="86" rx="4" />
                  </clipPath>
                </defs>

                {/* 1. Interior Cabin Background */}
                <rect
                  x={x}
                  y="22"
                  width="56"
                  height="86"
                  rx="4"
                  fill="url(#interiorGrad)"
                />

                {/* 2. Strictly Clipped Passenger & Seat Layer (Cannot overlap bus exterior) */}
                <g clipPath={`url(#${clipId})`}>
                  {winConfig.type === 'single' && winConfig.passenger1 && (
                    <g>
                      {/* High-backed seat */}
                      <rect x={x + winConfig.passenger1.offset + 4} y="44" width="22" height="64" rx="3" fill="#1e293b" />
                      <rect x={x + winConfig.passenger1.offset + 2} y="36" width="26" height="14" rx="4" fill="#334155" />

                      {/* Torso */}
                      <path
                        d={`M ${x + winConfig.passenger1.offset} 108 C ${x + winConfig.passenger1.offset} 74 ${x + winConfig.passenger1.offset + 32} 74 ${x + winConfig.passenger1.offset + 32} 108 Z`}
                        fill={winConfig.passenger1.sweater}
                      />

                      {/* Head */}
                      <circle cx={x + winConfig.passenger1.offset + 16} cy="53" r="8" fill={winConfig.passenger1.skin} />

                      {/* Hair / Scarf */}
                      {winConfig.passenger1.hair === '#020617' ? (
                        <g>
                          <path
                            d={`M ${x + winConfig.passenger1.offset + 7} 53 C ${x + winConfig.passenger1.offset + 7} 42 ${x + winConfig.passenger1.offset + 25} 42 ${x + winConfig.passenger1.offset + 25} 53 Z`}
                            fill="#020617"
                          />
                          <path
                            d={`M ${x + winConfig.passenger1.offset + 7} 53 L ${x + winConfig.passenger1.offset + 5} 78 L ${x + winConfig.passenger1.offset + 11} 78 Z`}
                            fill="#020617"
                          />
                        </g>
                      ) : (
                        <path
                          d={`M ${x + winConfig.passenger1.offset + 8} 52 C ${x + winConfig.passenger1.offset + 8} 43 ${x + winConfig.passenger1.offset + 24} 43 ${x + winConfig.passenger1.offset + 24} 52 Z`}
                          fill={winConfig.passenger1.hair}
                        />
                      )}

                      {/* Accessories */}
                      {winConfig.passenger1.accessory === 'headphones' && (
                        <g>
                          <path
                            d={`M ${x + winConfig.passenger1.offset + 7} 53 A 9 9 0 0 1 ${x + winConfig.passenger1.offset + 25} 53`}
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                            fill="none"
                          />
                          <rect x={x + winConfig.passenger1.offset + 5} y="50" width="3" height="6" rx="1" fill="#38bdf8" />
                          <rect x={x + winConfig.passenger1.offset + 24} y="50" width="3" height="6" rx="1" fill="#38bdf8" />
                        </g>
                      )}

                      {winConfig.passenger1.accessory === 'scarf' && (
                        <path
                          d={`M ${x + winConfig.passenger1.offset + 8} 61 C ${x + winConfig.passenger1.offset + 8} 67 ${x + winConfig.passenger1.offset + 24} 67 ${x + winConfig.passenger1.offset + 24} 61 Z`}
                          fill="#fbbf24"
                        />
                      )}

                      {winConfig.passenger1.prop === 'chai' && (
                        <g>
                          <rect x={x + winConfig.passenger1.offset + 22} y="80" width="7" height="10" rx="1.5" fill="#fef08a" />
                          <path d={`M ${x + winConfig.passenger1.offset + 25} 78 Q ${x + winConfig.passenger1.offset + 23} 74 ${x + winConfig.passenger1.offset + 25} 70`} stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.7" />
                        </g>
                      )}
                    </g>
                  )}

                  {winConfig.type === 'double' && winConfig.passenger1 && winConfig.passenger2 && (
                    <g>
                      {/* Back Passenger */}
                      <rect x={x + winConfig.passenger1.offset + 2} y="44" width="18" height="64" rx="3" fill="#1e293b" />
                      <path
                        d={`M ${x + winConfig.passenger1.offset} 108 C ${x + winConfig.passenger1.offset} 78 ${x + winConfig.passenger1.offset + 22} 78 ${x + winConfig.passenger1.offset + 22} 108 Z`}
                        fill={winConfig.passenger1.sweater}
                      />
                      <circle cx={x + winConfig.passenger1.offset + 11} cy="55" r="7" fill={winConfig.passenger1.skin} />
                      <path
                        d={`M ${x + winConfig.passenger1.offset + 4} 54 C ${x + winConfig.passenger1.offset + 4} 45 ${x + winConfig.passenger1.offset + 18} 45 ${x + winConfig.passenger1.offset + 18} 54 Z`}
                        fill={winConfig.passenger1.hair}
                      />
                      {winConfig.passenger1.accessory === 'neckpillow' && (
                        <path
                          d={`M ${x + winConfig.passenger1.offset + 4} 60 C ${x + winConfig.passenger1.offset + 4} 66 ${x + winConfig.passenger1.offset + 18} 66 ${x + winConfig.passenger1.offset + 18} 60 Z`}
                          fill="#a855f7"
                        />
                      )}

                      {/* Front Passenger */}
                      <rect x={x + winConfig.passenger2.offset + 2} y="44" width="20" height="64" rx="3" fill="#1e293b" />
                      <path
                        d={`M ${x + winConfig.passenger2.offset} 108 C ${x + winConfig.passenger2.offset} 75 ${x + winConfig.passenger2.offset + 26} 75 ${x + winConfig.passenger2.offset + 26} 108 Z`}
                        fill={winConfig.passenger2.sweater}
                      />
                      <circle cx={x + winConfig.passenger2.offset + 13} cy="53" r="7.5" fill={winConfig.passenger2.skin} />

                      {winConfig.passenger2.accessory === 'beanie' ? (
                        <path
                          d={`M ${x + winConfig.passenger2.offset + 5} 52 C ${x + winConfig.passenger2.offset + 5} 42 ${x + winConfig.passenger2.offset + 21} 42 ${x + winConfig.passenger2.offset + 21} 52 Z`}
                          fill="#f97316"
                        />
                      ) : (
                        <path
                          d={`M ${x + winConfig.passenger2.offset + 5} 52 C ${x + winConfig.passenger2.offset + 5} 43 ${x + winConfig.passenger2.offset + 21} 43 ${x + winConfig.passenger2.offset + 21} 52 Z`}
                          fill={winConfig.passenger2.hair}
                        />
                      )}

                      {winConfig.passenger2.accessory === 'glasses' && (
                        <g>
                          <circle cx={x + winConfig.passenger2.offset + 16} cy="53" r="2.5" stroke="#f8fafc" strokeWidth="1" fill="none" />
                        </g>
                      )}

                      {winConfig.passenger2.prop === 'book' && (
                        <rect x={x + winConfig.passenger2.offset + 14} y="78" width="12" height="11" rx="1" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
                      )}
                    </g>
                  )}
                </g>

                {/* 3. Semi-Transparent Glass Window Overlay & Outer Frame */}
                <rect
                  x={x}
                  y="22"
                  width="56"
                  height="86"
                  rx="4"
                  fill="url(#glassGrad)"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />

                {/* 4. Subtle Glass Glare Reflections */}
                <path
                  d={`M ${x + 14} 23 L ${x + 28} 23 L ${x + 8} 107 L ${x + 3} 107 Z`}
                  fill="#ffffff"
                  opacity="0.10"
                />
                <path
                  d={`M ${x + 34} 23 L ${x + 48} 23 L ${x + 28} 107 L ${x + 16} 107 Z`}
                  fill="#ffffff"
                  opacity="0.10"
                />
              </g>
            );
          })}

          {/* Glowing Twin Headlights */}
          <rect x="432" y="114" width="18" height="22" rx="3" fill="#fef08a" stroke="#f59e0b" strokeWidth="1.5" />
          <polygon points="450,116 460,110 460,136 450,132" fill="#fef08a" opacity="0.4" />

          {/* Front Amber Turn Signal Light */}
          <rect x="414" y="118" width="13" height="14" rx="3" fill="#f97316" stroke="#c2410c" strokeWidth="1" />

          {/* Rear Red Brake Lights */}
          <rect x="15" y="120" width="8" height="24" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />

          {/* Chrome Door Handle & Trim Line */}
          <rect x="348" y="120" width="18" height="5" rx="2" fill="#f8fafc" />
          <rect x="15" y="138" width="433" height="3.5" fill="#cbd5e1" opacity="0.8" />

          {/* Detailed Alloy Wheels with Spoke Rotations & Automatic Steering */}
          {/* Rear Wheel */}
          <g>
            <circle cx="112" cy="155" r="40" fill="#0f172a" />
            <circle cx="112" cy="155" r="34" fill="#334155" />
            <circle cx="112" cy="155" r="23" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Rotating Alloy Spokes */}
            <g
              style={{
                transformOrigin: '112px 155px',
                transform: `rotate(${wheelRotation}deg)`
              }}
            >
              <line x1="112" y1="132" x2="112" y2="178" stroke="#64748b" strokeWidth="3" />
              <line x1="89" y1="155" x2="135" y2="155" stroke="#64748b" strokeWidth="3" />
            </g>
            <circle cx="112" cy="155" r="12" fill="#475569" />
            <circle cx="112" cy="155" r="5" fill="#f8fafc" />
          </g>

          {/* Front Wheel with Alloy Spoke Rotation */}
          <g>
            <circle cx="332" cy="155" r="40" fill="#0f172a" />
            <circle cx="332" cy="155" r="34" fill="#334155" />
            <circle cx="332" cy="155" r="23" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Rotating Alloy Spokes */}
            <g
              style={{
                transformOrigin: '332px 155px',
                transform: `rotate(${wheelRotation}deg)`
              }}
            >
              <line x1="332" y1="132" x2="332" y2="178" stroke="#64748b" strokeWidth="3" />
              <line x1="309" y1="155" x2="355" y2="155" stroke="#64748b" strokeWidth="3" />
            </g>
            <circle cx="332" cy="155" r="12" fill="#475569" />
            <circle cx="332" cy="155" r="5" fill="#f8fafc" />
          </g>
        </svg>
      </div>
    </div>
  );
};
