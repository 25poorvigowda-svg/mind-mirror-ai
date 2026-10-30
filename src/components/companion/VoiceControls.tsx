import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Globe } from 'lucide-react';
import { LANGUAGE_OPTIONS, type SupportedLanguage } from '../../services/speech';

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking?: boolean;
  isMuted: boolean;
  language: SupportedLanguage;
  interimTranscript: string;
  onToggleListen: () => void;
  onToggleMute: () => void;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isMuted,
  language,
  interimTranscript,
  onToggleListen,
  onToggleMute,
  onSelectLanguage,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Live Interim Speech Bubble */}
      {isListening && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 text-violet-200 text-sm animate-pulse">
          <Mic className="w-4 h-4 text-violet-400 shrink-0 animate-bounce" />
          <span className="italic">
            {interimTranscript || 'Listening... speak in your selected language'}
          </span>
        </div>
      )}

      {/* Controls toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <select
            value={language}
            onChange={(e) => onSelectLanguage(e.target.value as SupportedLanguage)}
            className="bg-slate-800/90 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.flag} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Central Mic Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleListen}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-cyan-500/25'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Speak to Companion</span>
              </>
            )}
          </button>
        </div>

        {/* Mute/Unmute TTS Voice */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute voice' : 'Mute voice'}
          className={`p-2.5 rounded-xl border transition-colors ${
            isMuted
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
