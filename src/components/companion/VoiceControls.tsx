import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Globe, Square, Volume1 } from 'lucide-react';
import { LANGUAGE_OPTIONS, type SupportedLanguage } from '../../services/speech';

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking?: boolean;
  isMuted: boolean;
  language: SupportedLanguage;
  interimTranscript: string;
  onToggleListen: () => void;
  onToggleMute: () => void;
  onStopSpeaking?: () => void;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isSpeaking,
  isMuted,
  language,
  interimTranscript,
  onToggleListen,
  onToggleMute,
  onStopSpeaking,
  onSelectLanguage,
}) => {
  const getListeningPlaceholder = (lang: SupportedLanguage) => {
    switch (lang) {
      case 'kn-IN':
        return 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... ಮಾತನಾಡಿ (Listening in Kannada)';
      case 'hi-IN':
        return 'सुन रहा हूँ... बोलिए (Listening in Hindi)';
      default:
        return 'Listening... Speak naturally in English';
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Live Speech Recognition Bubble */}
      {isListening && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-violet-950/50 border border-violet-500/40 text-violet-200 text-xs shadow-lg animate-pulse">
          <Mic className="w-4 h-4 text-violet-400 shrink-0 animate-bounce" />
          <span className="font-medium italic">
            {interimTranscript || getListeningPlaceholder(language)}
          </span>
        </div>
      )}

      {/* Speaking Active Indicator with Interrupt Button */}
      {isSpeaking && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <Volume1 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-semibold">Pluto is speaking...</span>
          </div>

          {onStopSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Interrupt / Stop</span>
            </button>
          )}
        </div>
      )}

      {/* Controls toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/90 border border-slate-800 dark:border-slate-800 light:border-slate-200 backdrop-blur-md shadow-md">
        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <select
            value={language}
            onChange={(e) => onSelectLanguage(e.target.value as SupportedLanguage)}
            className="bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 border border-slate-700/80 rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.flag} {opt.label} ({opt.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Central Mic Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleListen}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-lg cursor-pointer ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-cyan-500/25'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Done Speaking</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Voice Input</span>
              </>
            )}
          </button>
        </div>

        {/* Mute/Unmute TTS Voice */}
        <div className="flex items-center gap-2">
          {isSpeaking && onStopSpeaking && (
            <button
              onClick={onStopSpeaking}
              title="Stop speaking"
              className="p-2 rounded-xl bg-slate-800 text-rose-300 border border-rose-500/30 hover:bg-rose-950/40 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
