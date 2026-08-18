// Web Audio API & MP3 audio helper for Indian Bus Horn sound and procedural demo tracks
import { saveCustomHornBlob, getCustomHornRecord, clearCustomHornFromDB } from './db';

let audioCtx: AudioContext | null = null;
let hornAudioElement: HTMLAudioElement | null = null;
let defaultHornWavBlobUrl: string | null = null;
let customHornMp3Url: string | null = null;
let customHornFileName: string | null = null;

// Initialize custom horn from IndexedDB if previously saved
getCustomHornRecord().then((rec) => {
  if (rec) {
    customHornMp3Url = rec.url;
    customHornFileName = rec.name;
  }
}).catch((err) => {
  console.warn('Could not load custom horn from DB:', err);
});

/**
 * Generate a rich, realistic Indian pneumatic bus air horn PCM WAV audio Blob URL
 */
function getDefaultHornWavUrl(): string {
  if (defaultHornWavBlobUrl) return defaultHornWavBlobUrl;

  try {
    const sampleRate = 44100;
    const durationSec = 0.82;
    const totalSamples = Math.floor(sampleRate * durationSec);
    const pcm16 = new Int16Array(totalSamples);

    // Fundamental frequencies for authentic Indian dual-tone air horn
    const f1 = 375.0; // Main trumpet
    const f2 = 468.0; // Dissonant high trumpet
    const f3 = 750.0; // High harmonic

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Pneumatic valve pressure envelope
      let envelope = 0;
      if (t < 0.05) {
        // Attack: Exponential pressure buildup
        envelope = Math.pow(t / 0.05, 1.8);
      } else if (t < 0.62) {
        // Sustain: Solid pressure with slight pneumatic vibration (6Hz tremolo)
        envelope = 0.95 + 0.05 * Math.sin(2 * Math.PI * 6.0 * t);
      } else {
        // Release: Air pressure cutoff
        const relT = (t - 0.62) / (durationSec - 0.62);
        envelope = Math.max(0, 1.0 - Math.pow(relT, 1.4));
      }

      // Air pressure pitch bend during initial valve opening
      const pitchFactor = t < 0.06 ? 0.92 + (t / 0.06) * 0.08 : 1.0;

      // Brassy horn tone synthesis (Sawtooth + Sine blend)
      const phase1 = 2 * Math.PI * (f1 * pitchFactor) * t;
      const phase2 = 2 * Math.PI * (f2 * pitchFactor) * t;
      const phase3 = 2 * Math.PI * (f3 * pitchFactor) * t;

      // Rich harmonic synthesis
      const wave1 = (Math.sin(phase1) + 0.5 * Math.sin(2 * phase1) + 0.25 * Math.sin(3 * phase1)) * 0.45;
      const wave2 = (Math.sin(phase2) + 0.4 * Math.sin(2 * phase2)) * 0.38;
      const wave3 = Math.sin(phase3) * 0.17;

      // Pneumatic air hiss noise (valve release)
      const airHiss = (Math.random() * 2 - 1) * (t > 0.58 ? 0.08 : 0.02);

      const combined = (wave1 + wave2 + wave3 + airHiss) * envelope * 0.85;
      const clamped = Math.max(-1, Math.min(1, combined));

      pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    }

    // Build WAV header
    const wavHeader = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(wavHeader);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcm16.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcm16.length * 2, true);

    const pcmBytes = new Uint8Array(wavHeader, 44);
    for (let i = 0; i < pcm16.length; i++) {
      const val = pcm16[i];
      pcmBytes[i * 2] = val & 0xff;
      pcmBytes[i * 2 + 1] = (val >> 8) & 0xff;
    }

    const blob = new Blob([wavHeader], { type: 'audio/wav' });
    defaultHornWavBlobUrl = URL.createObjectURL(blob);
    return defaultHornWavBlobUrl;
  } catch (err) {
    console.error('Failed to generate default horn audio URL:', err);
    return '';
  }
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Set custom MP3 file/URL for the bus horn
 */
export function setHornMp3Url(url: string, name: string = 'custom_horn.mp3') {
  customHornMp3Url = url;
  customHornFileName = name;
  if (hornAudioElement) {
    hornAudioElement.src = url;
    hornAudioElement.load();
  }
}

export async function setHornMp3File(file: File): Promise<string> {
  customHornFileName = file.name;
  const blobUrl = await saveCustomHornBlob(file);
  setHornMp3Url(blobUrl, file.name);
  return file.name;
}

export async function resetHornToDefault(): Promise<void> {
  customHornMp3Url = null;
  customHornFileName = null;
  await clearCustomHornFromDB();
  if (hornAudioElement) {
    hornAudioElement.src = getDefaultHornWavUrl();
    hornAudioElement.load();
  }
}

export function getHornName(): string {
  return customHornFileName || 'Default Air Horn';
}

export function isCustomHornActive(): boolean {
  return customHornMp3Url !== null;
}

/**
 * Play authentic Indian Bus Horn using generated default WAV sound or custom MP3 file
 */
export function playBusHorn(volume: number = 0.8) {
  if (volume <= 0) return;

  // Use custom MP3 URL if set, otherwise default to pre-rendered authentic air horn WAV
  const targetAudioUrl = customHornMp3Url || getDefaultHornWavUrl();

  if (!targetAudioUrl) {
    playSynthBusHorn(volume);
    return;
  }

  if (!hornAudioElement) {
    hornAudioElement = new Audio(targetAudioUrl);
  } else if (hornAudioElement.src !== new URL(targetAudioUrl, window.location.href).href) {
    hornAudioElement.src = targetAudioUrl;
  }

  hornAudioElement.volume = Math.max(0, Math.min(1, volume));
  hornAudioElement.currentTime = 0;

  const playPromise = hornAudioElement.play();

  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // If HTMLAudioElement play fails or is blocked, fallback to Web Audio API synth
      playSynthBusHorn(volume);
    });
  }
}

/**
 * Fallback Web Audio API Dual-Tone Air Horn ("PHOO PHOO / HONK HONK!")
 */
function playSynthBusHorn(volume: number = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dual-tone pneumatic air horn frequencies (classic Leyland/Tata bus pitch)
    const freq1 = 380; // Main air horn frequency
    const freq2 = 475; // Harmonic dissonance air horn frequency

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // Slight pitch bend up at start like pneumatic air pressure building up
    osc1.frequency.setValueAtTime(freq1 * 0.92, now);
    osc1.frequency.exponentialRampToValueAtTime(freq1, now + 0.05);
    
    osc2.frequency.setValueAtTime(freq2 * 0.92, now);
    osc2.frequency.exponentialRampToValueAtTime(freq2, now + 0.05);

    // Resonant lowpass filter for brassy horn body
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(3, now);

    // Envelope for double honk or solid loud honk
    const duration = 0.55;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.04);
    gainNode.gain.setValueAtTime(volume * 0.65, now + duration - 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (err) {
    console.error('Error playing bus horn synth:', err);
  }
}

/**
 * Create a procedural lo-fi audio WAV file for preset songs
 */
export function createProceduralNostalgicTrack(
  title: string,
  bpm: number = 70,
  scale: number[] = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C major pentatonic
  lengthSeconds: number = 180
): string {
  const sampleRate = 22050; // Moderate sample rate for lo-fi feel and fast buffer creation
  const numSamples = sampleRate * lengthSeconds;
  
  // Create offline audio context
  const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);

  // Master gain
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = 0.4;

  // Add subtle vinyl crackle / tape hiss noise floor
  const bufferSize = numSamples;
  const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.008; // soft pinkish tape hiss
  }
  const noiseSource = offlineCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = offlineCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 2500;
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(masterGain);
  noiseSource.start(0);

  // Soft Indian Tanpura/Drone (Root C3 = 130.81 Hz, G3 = 196 Hz)
  [130.81, 196.00, 261.63].forEach((freq) => {
    const droneOsc = offlineCtx.createOscillator();
    const droneGain = offlineCtx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = freq;
    
    // Slow swell LFO for tanpura effect
    droneGain.gain.setValueAtTime(0.06, 0);
    
    droneOsc.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start(0);
  });

  // Melodic melody loop using delay & reverb simulation
  const beatSec = 60 / bpm;
  const stepCount = Math.floor(lengthSeconds / beatSec);

  for (let step = 0; step < stepCount; step++) {
    const time = step * beatSec;
    
    // Arpeggio / Sitar-like chime on every beat or half beat
    if (step % 2 === 0 || Math.random() > 0.4) {
      const noteFreq = scale[Math.floor(Math.random() * scale.length)];
      
      const melOsc = offlineCtx.createOscillator();
      const melGain = offlineCtx.createGain();
      
      melOsc.type = step % 4 === 0 ? 'triangle' : 'sine';
      melOsc.frequency.setValueAtTime(noteFreq, time);
      
      // Pluck envelope
      melGain.gain.setValueAtTime(0.12, time);
      melGain.gain.exponentialRampToValueAtTime(0.0001, time + beatSec * 1.8);

      melOsc.connect(melGain);
      melGain.connect(masterGain);
      
      melOsc.start(time);
      melOsc.stop(time + beatSec * 2);
    }
  }

  masterGain.connect(offlineCtx.destination);

  // Render offline audio to a buffer synchronously using promise
  // Render offline ctx
  let audioBuffer: AudioBuffer;
  
  // We can generate audio data synchronously or render via buffer
  // For standard browser support, renderBuffer:
  return createLoFiWavDataUri(sampleRate, lengthSeconds, bpm, scale);
}

// Simple synth sound generator to produce immediate Blobs for nostalgic preset songs
function createLoFiWavDataUri(sampleRate: number, durationSec: number, bpm: number, scale: number[]): string {
  const totalSamples = sampleRate * durationSec;
  const pcm16 = new Int16Array(totalSamples);

  const beatSec = 60 / bpm;
  let currentNoteFreq = scale[0];
  let noteTimer = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Change note every beat
    if (t >= noteTimer) {
      noteTimer += beatSec * (Math.random() > 0.6 ? 1 : 2);
      currentNoteFreq = scale[Math.floor(Math.random() * scale.length)];
    }

    // Melodic wave (decaying pluck)
    const timeInNote = (t % (beatSec * 2)) / (beatSec * 2);
    const env = Math.exp(-timeInNote * 3);
    const melodyVal = Math.sin(2 * Math.PI * currentNoteFreq * t) * env * 0.25;

    // Soft bass drone (130.81Hz C3 + 196Hz G3)
    const droneVal = (Math.sin(2 * Math.PI * 130.81 * t) + Math.sin(2 * Math.PI * 196.0 * t)) * 0.12;

    // Soft vinyl hiss
    const noiseVal = (Math.random() * 2 - 1) * 0.015;

    const sampleFloat = Math.max(-1, Math.min(1, melodyVal + droneVal + noiseVal));
    pcm16[i] = sampleFloat < 0 ? sampleFloat * 0x8000 : sampleFloat * 0x7FFF;
  }

  // Build WAV header
  const wavHeader = new ArrayBuffer(44 + pcm16.length * 2);
  const view = new DataView(wavHeader);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + pcm16.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, sampleRate * 2, true);
  /* block align */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, pcm16.length * 2, true);

  // Write PCM samples
  const pcmBytes = new Uint8Array(wavHeader, 44);
  for (let i = 0; i < pcm16.length; i++) {
    const val = pcm16[i];
    pcmBytes[i * 2] = val & 0xff;
    pcmBytes[i * 2 + 1] = (val >> 8) & 0xff;
  }

  const blob = new Blob([wavHeader], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function playBirdChirpSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Quick dual tweet / chirp
    for (let i = 0; i < 2; i++) {
      const startTime = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2800 + Math.random() * 400, startTime);
      osc.frequency.exponentialRampToValueAtTime(3800 + Math.random() * 500, startTime + 0.08);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.09);
    }
  } catch (err) {
    console.error('Error playing bird chirp:', err);
  }
}

export function playCowBellSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Metallic chime frequencies (typical brass cow bell)
    osc1.type = 'square';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(540, now);
    osc2.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.52);
    osc2.stop(now + 0.52);
  } catch (err) {
    console.error('Error playing cow bell:', err);
  }
}

export function playRickshawSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 2-stroke engine chug (4 quick bursts)
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110 + Math.random() * 20, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    }
  } catch (err) {
    console.error('Error playing rickshaw sound:', err);
  }
}

export function playDogBarkSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.09);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    }
  } catch (err) {
    console.error('Error playing dog bark:', err);
  }
}

export function playTruckHornSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Heavy low pneumatic truck horn
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, now);
    osc2.frequency.setValueAtTime(225, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.error('Error playing truck horn:', err);
  }
}

export function playTrainWhistleSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dual chime train horn (classic Indian Railways steam/diesel horn)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(311, now); // Eb4
    osc2.frequency.setValueAtTime(370, now); // F#4

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.setValueAtTime(0.18, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.45);
    osc2.stop(now + 1.45);
  } catch (err) {
    console.error('Error playing train whistle:', err);
  }
}

export function playChaiSellerSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // High brass kettle chime / teacup clink (ding-ding)
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400 + i * 200, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    }
  } catch (err) {
    console.error('Error playing chai seller sound:', err);
  }
}

export function playTractorSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Heavy single-cylinder diesel tractor thud-thud
    for (let i = 0; i < 6; i++) {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    }
  } catch (err) {
    console.error('Error playing tractor sound:', err);
  }
}

/**
 * Conductor's Pea Whistle sound ("Pweeet! Pweet!")
 */
export function playConductorWhistleSound(volume: number = 0.25) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Authentic double-whistle burst ("Pweeet... Pweet!")
    const bursts = [
      { start: 0, duration: 0.26 },
      { start: 0.32, duration: 0.20 }
    ];

    bursts.forEach(({ start, duration }) => {
      const startTime = now + start;
      const carrier = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Main metal whistle resonance ~2650 Hz
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(2650, startTime);

      // Whistle pea trill LFO at ~26 Hz for authentic flutter
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(26, startTime);
      lfoGain.gain.setValueAtTime(140, startTime);

      lfo.connect(carrier.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2650, startTime);
      filter.Q.setValueAtTime(5, startTime);

      // Envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.02);
      gain.gain.setValueAtTime(volume * 0.3, startTime + duration - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      carrier.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(startTime);
      carrier.start(startTime);
      lfo.stop(startTime + duration);
      carrier.stop(startTime + duration);
    });
  } catch (err) {
    console.error('Error playing conductor whistle:', err);
  }
}

/**
 * Passenger Chatter / Murmur Ambient sound (Soft background crowd chatter on stationary bus)
 */
let chatterIntervalId: number | null = null;

export function playPassengerChatterBurst(volume: number = 0.06) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 2.4 + Math.random() * 1.4;

    // Pinkish background murmur noise
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.05;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Formant speech filter for realistic vocal murmur texture
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(480 + Math.random() * 250, now);
    filter.Q.setValueAtTime(3.8, now);

    // LFO for speech cadence modulation
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(3.8 + Math.random() * 2.2, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.35);
    gain.gain.setValueAtTime(volume * 0.75, now + duration - 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(now);
    noiseSource.start(now);
    lfo.stop(now + duration);
    noiseSource.stop(now + duration);

    // Soft vocal formants / chatter chirps
    const vocalCount = 3 + Math.floor(Math.random() * 3);
    for (let v = 0; v < vocalCount; v++) {
      const vTime = now + 0.18 + v * 0.55 + Math.random() * 0.25;
      const vOsc = ctx.createOscillator();
      const vGain = ctx.createGain();

      vOsc.type = 'triangle';
      vOsc.frequency.setValueAtTime(210 + Math.random() * 170, vTime);
      vOsc.frequency.exponentialRampToValueAtTime(150 + Math.random() * 90, vTime + 0.16);

      vGain.gain.setValueAtTime(0, vTime);
      vGain.gain.linearRampToValueAtTime(volume * 0.22, vTime + 0.03);
      vGain.gain.exponentialRampToValueAtTime(0.0001, vTime + 0.16);

      const vFilter = ctx.createBiquadFilter();
      vFilter.type = 'lowpass';
      vFilter.frequency.setValueAtTime(750, vTime);

      vOsc.connect(vFilter);
      vFilter.connect(vGain);
      vGain.connect(ctx.destination);

      vOsc.start(vTime);
      vOsc.stop(vTime + 0.18);
    }
  } catch (err) {
    console.error('Error playing passenger chatter:', err);
  }
}

/**
 * Start randomized stationary bus ambient audio (conductor whistle, passenger chatter murmur, chai calls)
 * ONLY plays while bus is stationary at a stop.
 */
export function startStationaryBusAmbientAudio() {
  stopStationaryBusAmbientAudio();

  // 1. Conductor whistle upon initial stop arrival
  setTimeout(() => {
    playConductorWhistleSound(0.26);
  }, 350);

  // 2. Play initial soft passenger chatter murmur
  setTimeout(() => {
    playPassengerChatterBurst(0.05);
  }, 750);

  // 3. Interval for randomized ambient audio triggers while stationary
  chatterIntervalId = window.setInterval(() => {
    const roll = Math.random();
    if (roll < 0.55) {
      playPassengerChatterBurst(0.04 + Math.random() * 0.03);
    } else if (roll < 0.85) {
      playConductorWhistleSound(0.22);
    } else {
      playChaiSellerSound();
    }
  }, 2600);
}

export function stopStationaryBusAmbientAudio() {
  if (chatterIntervalId !== null) {
    clearInterval(chatterIntervalId);
    chatterIntervalId = null;
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
