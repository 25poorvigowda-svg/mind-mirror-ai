// Web Speech API interfaces for TypeScript
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export type SupportedLanguage = 'en-US' | 'hi-IN' | 'kn-IN';

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string; nativeName: string; flag: string }[] = [
  { code: 'en-US', label: 'English', nativeName: 'English (US)', flag: '🇬🇧' },
  { code: 'hi-IN', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn-IN', label: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

/**
 * Automatically identify language from input text
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text) return 'en-US';
  // Kannada unicode range: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn-IN';
  }
  // Hindi (Devanagari) unicode range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi-IN';
  }
  // Romanized Kannada words
  const lower = text.toLowerCase();
  if (/\b(namaskara|hegidira|hegiddira|oota|banni|dhanyavada|nanna|neevu|enu|yaake|beku|illa)\b/.test(lower)) {
    return 'kn-IN';
  }
  // Romanized Hindi words
  if (/\b(namaste|kya|hai|haan|nahi|kaise|ho|theek|accha|shukriya|mera|mujhe|bahut|karna)\b/.test(lower)) {
    return 'hi-IN';
  }
  return 'en-US';
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface SpeechSynthesisCallbacks {
  onStart?: () => void;
  onBoundary?: (charIndex: number, name: string) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private lipSyncCallback: ((amplitude: number) => void) | null = null;
  private lipSyncInterval: number | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      return true;
    }
    return false;
  }

  public isRecognitionSupported(): boolean {
    return !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public startListening(
    language: string,
    callbacks: SpeechRecognitionCallbacks
  ): boolean {
    if (!this.recognition) {
      const initialized = this.initRecognition();
      if (!initialized) {
        callbacks.onError?.('Speech recognition is not supported in this browser.');
        return false;
      }
    }

    try {
      this.recognition.lang = language || 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        callbacks.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        const isFinal = !!finalTranscript;
        callbacks.onResult?.(text, isFinal);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        console.warn('Speech recognition error event:', event.error);
        callbacks.onError?.(event.error || 'Speech recognition error');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        callbacks.onEnd?.();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('Failed to start recognition:', err);
      callbacks.onError?.(err.message || 'Microphone activation failed');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.isListening = false;
    }
  }

  /**
   * Set callback for avatar mouth lip-sync amplitude
   */
  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  public setLipSyncCallback(cb: ((amplitude: number) => void) | null): void {
    this.lipSyncCallback = cb;
  }

  /**
   * Multilingual text to speech with lip-sync simulation
   */
  public speak(
    text: string,
    language = 'en-US',
    speed = 1.0,
    callbacks?: SpeechSynthesisCallbacks
  ): void {
    if (!this.isSynthesisSupported()) {
      callbacks?.onError?.('Speech synthesis not supported');
      return;
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    this.stopLipSync();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = Math.max(0.7, Math.min(1.3, speed));
    utterance.pitch = 1.05; // Gentle, empathetic voice tone

    // Choose female voice matching language if available
    const voices = window.speechSynthesis.getVoices();
    const targetLangCode = language.replace('_', '-');
    const exactLangVoices = voices.filter(
      (v) => v.lang.toLowerCase() === targetLangCode.toLowerCase() || v.lang.toLowerCase().startsWith(targetLangCode.slice(0, 2).toLowerCase())
    );

    // Prefer female voice identifiers
    const femaleVoice = exactLangVoices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes('female') ||
        n.includes('natural') ||
        n.includes('zira') ||
        n.includes('samantha') ||
        n.includes('kore') ||
        n.includes('swara') ||
        n.includes('kalpana') ||
        n.includes('shruti') ||
        n.includes('victoria') ||
        n.includes('google')
      );
    });

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (exactLangVoices.length > 0) {
      utterance.voice = exactLangVoices[0];
    }

    utterance.onstart = () => {
      this.startLipSync();
      callbacks?.onStart?.();
    };

    utterance.onboundary = (event) => {
      // Trigger a viseme pulse on word/sentence boundaries
      if (this.lipSyncCallback) {
        this.lipSyncCallback(0.75 + Math.random() * 0.25);
      }
      callbacks?.onBoundary?.(event.charIndex, event.name);
    };

    utterance.onend = () => {
      this.stopLipSync();
      callbacks?.onEnd?.();
    };

    utterance.onerror = (err) => {
      this.stopLipSync();
      callbacks?.onError?.(err);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.stopLipSync();
  }

  private startLipSync(): void {
    this.stopLipSync();
    if (!this.lipSyncCallback) return;

    // Simulate speech phoneme modulation (viseme mouth movement)
    this.lipSyncInterval = window.setInterval(() => {
      if (!this.lipSyncCallback) return;
      // Oscillate with dynamic speech cadence
      const time = Date.now() / 120;
      const wave = Math.sin(time) * 0.5 + Math.cos(time * 2.3) * 0.3 + 0.4;
      const amp = Math.max(0, Math.min(1, wave));
      this.lipSyncCallback(amp);
    }, 60);
  }

  private stopLipSync(): void {
    if (this.lipSyncInterval !== null) {
      clearInterval(this.lipSyncInterval);
      this.lipSyncInterval = null;
    }
    if (this.lipSyncCallback) {
      this.lipSyncCallback(0);
    }
  }

  /**
   * Play subtle soothing chime audio using Web Audio API
   */
  public playChime(type: 'complete' | 'notification' | 'breathe'): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'complete') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'breathe') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, now); // C4
        osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.4);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      } else {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }
}

export const speechService = new SpeechService();
