import { SceneConfig, SceneType } from '../types';

export const SCENES: Record<SceneType, SceneConfig> = {
  autumn: {
    id: 'autumn',
    name: 'Autumn Road',
    weatherLabel: '🍂 Golden Autumn Sunlight',
    skyGradient: 'from-amber-600 via-orange-400 to-amber-200',
    sunOrMoon: 'sunset-sun',
    groundColor: '#9a4c1e',
    roadColor: '#3d312a',
    mountainColor: '#7c3a18',
    treeColors: ['#d97706', '#b45309', '#ea580c', '#c2410c'],
    ambientParticle: 'sunset-glow',
    stops: [
      { name: '🚏 CHIGURU VALLEY STOP', region: 'Karnataka', tagline: 'Golden leaves, warm breeze & sugarcane fields' },
      { name: '🚏 OOTY PINETA WAY', region: 'Tamil Nadu', tagline: 'Crisp autumn air & eucalyptus groves' }
    ],
    description: 'Golden sunlight streaming through warm orange trees, fallen leaves, and autumn hills.'
  },
  mountain: {
    id: 'mountain',
    name: 'Green Mountain',
    weatherLabel: '🌄 Fresh Alpine Hills',
    skyGradient: 'from-sky-600 via-teal-500 to-emerald-100',
    sunOrMoon: 'mountain-mist',
    groundColor: '#2e5a27',
    roadColor: '#374151',
    mountainColor: '#1e3a29',
    treeColors: ['#15803d', '#166534', '#047857', '#065f46'],
    ambientParticle: 'none',
    stops: [
      { name: '🚏 SHIMLA VALLEY VIEW', region: 'Himachal Pradesh', tagline: 'Pine scented breeze and curved valley roads' },
      { name: '🚏 MUNNAR TEA GARDENS', region: 'Kerala', tagline: 'Rolling green hills and terraced plantations' }
    ],
    description: 'Towering green mountains, winding hillside roads, and valley freshness.'
  },
  night: {
    id: 'night',
    name: 'Night Highway',
    weatherLabel: '🌙 Starry Midnight Run',
    skyGradient: 'from-slate-950 via-indigo-950 to-slate-900',
    sunOrMoon: 'moon',
    groundColor: '#1e293b',
    roadColor: '#0f172a',
    mountainColor: '#020617',
    treeColors: ['#1e293b', '#0f172a', '#334155'],
    ambientParticle: 'fog',
    stops: [
      { name: '🚏 ALL-NIGHT HIGHWAY DHABA', region: 'NH-44 Expressway', tagline: 'Glowing neon sign, hot tea & starry skies' },
      { name: '🚏 MIDNIGHT TOLL PLAZA', region: 'Outer Ring Road', tagline: 'Silent night highway illuminated by streetlights' }
    ],
    description: 'Dark starry sky, glowing moon, quiet highway, and illuminated lane markings.'
  },
  rainy: {
    id: 'rainy',
    name: 'Monsoon Journey',
    weatherLabel: '🌧️ Refreshing Monsoon Rain',
    skyGradient: 'from-slate-800 via-slate-700 to-slate-900',
    sunOrMoon: 'rain-cloud',
    groundColor: '#1f3a24',
    roadColor: '#111827',
    mountainColor: '#1e293b',
    treeColors: ['#14532d', '#064e3b', '#166534'],
    ambientParticle: 'rain',
    stops: [
      { name: '🚏 KHANDALA GHAT STOP', region: 'Maharashtra', tagline: 'Misty hills, cutting chai & fresh corn stalls' },
      { name: '🚏 CHERAPUNJI ROADWAY', region: 'Meghalaya', tagline: 'Heavy rain, wooden shelters & wet green palm leaves' }
    ],
    description: 'Dark cloudy sky, soft raindrops on windows, wet glistening roads, and fresh greenery.'
  },
  straight: {
    id: 'straight',
    name: 'Straight Road',
    weatherLabel: '🛣️ Infinite Straight Expressway',
    skyGradient: 'from-amber-600 via-orange-500 to-sky-300',
    sunOrMoon: 'sunset-sun',
    groundColor: '#1e293b',
    roadColor: '#1e293b',
    mountainColor: '#334155',
    treeColors: ['#15803d', '#166534', '#d97706', '#ca8a04'],
    ambientParticle: 'sunset-glow',
    stops: [
      { name: '🚏 GOLDEN HORIZON STOP', region: 'NH-44 Straight Stretch', tagline: 'Endless asphalt, glowing horizon & open sky' },
      { name: '🚏 DESERT RUNWAY STOP', region: 'Rajasthan Highway', tagline: 'Mirage on straight tarmac & golden dust' }
    ],
    description: 'A long straight road continuing naturally into the horizon with fixed bus and moving environment.'
  }
};
