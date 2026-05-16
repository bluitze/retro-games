import type { GameStatus, SoundEvent } from "./types";

export interface RiverPatrolAudio {
  unlock: () => void;
  toggleMute: () => boolean;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  play: (event: SoundEvent) => void;
  updateEngine: (throttle: number, speed: number, status: GameStatus) => void;
  destroy: () => void;
}

export function createRiverPatrolAudio(): RiverPatrolAudio {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let engineOscillator: OscillatorNode | null = null;
  let engineGain: GainNode | null = null;
  let muted = false;

  const ensureContext = (): AudioContext | null => {
    if (!AudioContextConstructor) {
      return null;
    }

    if (!context) {
      context = new AudioContextConstructor();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.38;
      master.connect(context.destination);

      engineOscillator = context.createOscillator();
      engineGain = context.createGain();
      engineOscillator.type = "sawtooth";
      engineOscillator.frequency.value = 58;
      engineGain.gain.value = 0;
      engineOscillator.connect(engineGain);
      engineGain.connect(master);
      engineOscillator.start();
    }

    return context;
  };

  const playTone = (frequency: number, duration: number, type: OscillatorType, gain = 0.18, delay = 0): void => {
    const ctx = ensureContext();

    if (!ctx || !master || muted) {
      return;
    }

    const startAt = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  };

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx?.state === "suspended") {
        void ctx.resume();
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) {
        master.gain.value = muted ? 0 : 0.38;
      }
      return muted;
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (master) {
        master.gain.value = muted ? 0 : 0.38;
      }
    },
    isMuted() {
      return muted;
    },
    play(event) {
      if (event === "shoot") {
        playTone(760, 0.07, "square", 0.12);
      } else if (event === "explosion") {
        playTone(92, 0.22, "sawtooth", 0.24);
        playTone(47, 0.28, "triangle", 0.16);
      } else if (event === "fuel") {
        playTone(420, 0.09, "square", 0.1);
        playTone(620, 0.12, "square", 0.1, 0.07);
      } else if (event === "lowFuel") {
        playTone(980, 0.08, "square", 0.11);
      } else if (event === "bridge") {
        playTone(160, 0.32, "sawtooth", 0.25);
        playTone(520, 0.18, "triangle", 0.16, 0.09);
      }
    },
    updateEngine(throttle, speed, status) {
      const ctx = ensureContext();

      if (!ctx || !engineOscillator || !engineGain || muted) {
        if (engineGain) {
          engineGain.gain.value = 0;
        }
        return;
      }

      const active = status === "playing";
      const frequency = 48 + throttle * 65 + speed * 0.16;
      engineOscillator.frequency.setTargetAtTime(frequency, ctx.currentTime, 0.06);
      engineGain.gain.setTargetAtTime(active ? 0.04 + throttle * 0.09 : 0.008, ctx.currentTime, 0.08);
    },
    destroy() {
      engineOscillator?.stop();
      engineOscillator?.disconnect();
      engineGain?.disconnect();
      master?.disconnect();
      void context?.close();
      context = null;
      master = null;
      engineOscillator = null;
      engineGain = null;
    },
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
