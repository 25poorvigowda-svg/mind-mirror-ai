import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Globe,
  Database,
  Download,
  Upload,
  RotateCcw,
  Volume2,
  Check,
  Eye,
  EyeOff,
  Play,
  HeartHandshake,
  Bot,
} from 'lucide-react';
import type { UserSettings } from '../types';
import {
  updateSettings,
  exportDatabaseJSON,
  importDatabaseJSON,
  resetDatabase,
} from '../services/db';
import { LANGUAGE_OPTIONS, type SupportedLanguage } from '../services/speech';
import confetti from 'canvas-confetti';

interface SettingsViewProps {
  settings: UserSettings;
  onSettingsChanged: () => void;
  onSeedDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsChanged,
  onSeedDemoData,
}) => {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(
    (settings.language as SupportedLanguage) || 'en-US'
  );
  const [ttsSpeed, setTtsSpeed] = useState(settings.ttsSpeed || 1.0);
  const [avatarModel, setAvatarModel] = useState(settings.avatarModel || 'stylized_human');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveApiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      geminiApiKey: apiKey.trim(),
      language,
      ttsSpeed,
      avatarModel,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onSettingsChanged();
  };

  const handleExportData = async () => {
    const jsonStr = await exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-mirror-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDatabaseJSON(content);
      setImportStatus(res.message);
      if (res.success) {
        confetti({ particleCount: 40, spread: 50 });
        onSettingsChanged();
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        'WARNING: This will erase all your local check-in records and tasks. Are you sure you wish to start fresh?'
      )
    ) {
      await resetDatabase();
      onSettingsChanged();
      alert('All local database records have been reset to a fresh state.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local-First Security & Configuration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Privacy, AI Keys & Settings
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Mind Mirror AI is engineered local-first. You own all your data; it never leaves your browser unless an external AI API key is explicitly configured.
        </p>
      </div>

      {/* Local-First Architecture Guarantee Card */}
      <div className="rounded-3xl bg-slate-900/60 border border-teal-500/30 p-6 backdrop-blur-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-950/80 text-teal-400 border border-teal-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Local-First Storage Guarantee</h3>
            <p className="text-xs text-slate-400">IndexedDB persistence with client-side analysis</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          All your mood logs, sleep hours, stress assessments, journals, and tasks are stored exclusively in your browser’s IndexedDB sandbox. Even when no API key is provided, the application runs fully and generates reflections using our built-in <strong>Local Mind Engine</strong>.
        </p>
      </div>

      {/* AI Engine & API Key Form */}
      <div className="rounded-3xl bg-slate-900/60 border border-cyan-500/20 p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>AI Model & API Configuration</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Connect to Google Gemini 2.5 Flash for deep, personalized conversational reflections, or use the built-in Local Mind Engine.
          </p>
        </div>

        <form onSubmit={handleSaveApiSettings} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Google Gemini API Key (Optional)</label>
              <span className="text-[11px] text-teal-400">Stored only in local storage</span>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (leave empty to use Built-in Local Mind Engine)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Get an API key free from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Google AI Studio</a>. If no key is entered, Mind Mirror automatically activates the high-fidelity Local Mind Engine.
            </p>
          </div>

          {/* Language Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Companion & Voice Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.flag} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5">
                <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Text-to-Speech Speed ({ttsSpeed}x)</span>
              </label>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={ttsSpeed}
                onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                className="w-full accent-teal-400 h-2 bg-slate-800 rounded-lg cursor-pointer mt-2"
              />
            </div>
          </div>

          {/* 3D Avatar Model Style */}
          <div className="pt-4 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
              <span>3D AI Companion Avatar Mode</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAvatarModel('stylized_human')}
                className={`p-3 rounded-2xl border text-xs font-semibold transition-all text-left ${
                  avatarModel === 'stylized_human'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-white">Stylized 3D Humanoid</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Head tracking, blinking & cyber aura</div>
              </button>

              <button
                type="button"
                onClick={() => setAvatarModel('robot_expressive')}
                className={`p-3 rounded-2xl border text-xs font-semibold transition-all text-left ${
                  avatarModel === 'robot_expressive'
                    ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-white">Expressive Cyber Robot</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Procedural animation & visemes</div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {saveSuccess ? (
              <span className="flex items-center gap-1.5 text-xs text-teal-400 font-semibold">
                <Check className="w-4 h-4" />
                <span>Settings saved to local storage!</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">No credentials are ever transmitted to third parties.</span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Database Management & Demo Data Seeder */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" />
            <span>Data Management & Hackathon Demo Tools</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Pre-seed realistic data for judging, or export/import your personal reflection records.
          </p>
        </div>

        {/* 1-Click Realistic Student Data Seeder */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30">
          <div>
            <h4 className="text-xs font-bold text-white">Seed Realistic 14-Day Student Data</h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Populates realistic exam crunch cycles, sleep variance, and journal reflections so all charts and correlations immediately showcase full capabilities.
            </p>
          </div>

          <button
            onClick={onSeedDemoData}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Seed 14-Day Dataset</span>
          </button>
        </div>

        {/* Export and Import JSON */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <button
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Database (JSON Backup)</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Import Database (JSON)</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        {importStatus && (
          <p className="text-xs text-center text-teal-400 bg-teal-950/40 p-2.5 rounded-xl border border-teal-500/30">
            {importStatus}
          </p>
        )}

        {/* Danger Zone: Reset Database */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <h5 className="text-xs font-bold text-rose-400">Clear All Local Records</h5>
            <p className="text-[11px] text-slate-500">Permanently erases all check-ins, tasks, and reflections.</p>
          </div>

          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-semibold text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Database</span>
          </button>
        </div>
      </div>

      {/* Ethical & Medical Disclaimer Card */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
        <HeartHandshake className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Notice:</strong> Mind Mirror AI is designed for student wellness self-reflection and academic habit awareness. It does not provide medical diagnoses, psychiatric assessments, or clinical interventions. If you are experiencing acute psychological distress, please connect with your institution’s counseling center or healthcare provider.
        </p>
      </div>
    </div>
  );
};
