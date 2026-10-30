import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  PlusCircle,
  Trash2,
  CornerDownRight,
  User,
} from 'lucide-react';
import type { DailyCheckIn, ChatMessage, UserSettings, UserProfile } from '../types';
import { AvatarScene } from '../components/companion/AvatarScene';
import { WaveVisualizer } from '../components/companion/WaveVisualizer';
import { VoiceControls } from '../components/companion/VoiceControls';
import { speechService, type SupportedLanguage } from '../services/speech';
import { generateCompanionReply } from '../services/ai';
import { db } from '../services/db';

interface CompanionViewProps {
  latestCheckIn?: DailyCheckIn;
  settings?: UserSettings;
  userProfile?: UserProfile;
  onAddTaskToPlanner: (taskTitle: string) => void;
}

export const CompanionView: React.FC<CompanionViewProps> = ({
  latestCheckIn,
  settings,
  userProfile,
  onAddTaskToPlanner,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lipSyncAmplitude, setLipSyncAmplitude] = useState(0);
  const [emotion, setEmotion] = useState<'calm' | 'empathetic' | 'encouraging' | 'thoughtful' | 'celebratory'>('thoughtful');
  const [language, setLanguage] = useState<SupportedLanguage>((settings?.language as SupportedLanguage) || 'en-US');
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userName = userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'there';

  // Load chat history from IndexedDB on mount
  useEffect(() => {
    async function loadHistory() {
      const saved = await db.chatHistory.orderBy('timestamp').toArray();
      if (saved.length > 0) {
        setMessages(saved);
      } else {
        // Welcome message from Pluto
        const initialGreeting: ChatMessage = {
          id: 'msg_init',
          sender: 'assistant',
          text: `Hey ${userName}! I'm Pluto, your 3D reflection companion. I'm here to listen, help you unpack what’s going on with your classes, sleep, and stress, and converse with you whenever you need to think out loud. How has your day felt so far?`,
          timestamp: Date.now(),
          followUpSuggestions: [
            'I have a lot on my mind with classes',
            'I\'ve been feeling exhausted lately',
            'Today was actually surprisingly productive',
          ],
        };
        setMessages([initialGreeting]);
        await db.chatHistory.add(initialGreeting);
      }
    }
    loadHistory();
  }, [userName]);

  // Set lip-sync callback
  useEffect(() => {
    speechService.setLipSyncCallback((amp) => {
      setLipSyncAmplitude(amp);
    });

    return () => {
      speechService.stopSpeaking();
      speechService.stopListening();
      speechService.setLipSyncCallback(null);
    };
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    setInterimTranscript('');

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now(),
      language,
    };

    setMessages((prev) => [...prev, userMessage]);
    await db.chatHistory.add(userMessage);

    setIsProcessing(true);
    setEmotion('thoughtful');

    try {
      const aiResponse = await generateCompanionReply(
        text,
        messages,
        latestCheckIn,
        settings,
        userProfile
      );

      const assistantMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        sender: 'assistant',
        text: aiResponse.reply,
        timestamp: Date.now(),
        language,
        extractedActions: aiResponse.suggestedActions,
        followUpSuggestions: aiResponse.followUpSuggestions,
        emotion: aiResponse.emotion,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await db.chatHistory.add(assistantMessage);

      setEmotion(aiResponse.emotion);

      // Vocalize response if not muted
      if (!isMuted) {
        setIsSpeaking(true);
        speechService.speak(aiResponse.reply, language, settings?.ttsSpeed || 1.0, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            setLipSyncAmplitude(0);
          },
          onError: () => {
            setIsSpeaking(false);
            setLipSyncAmplitude(0);
          },
        });
      }
    } catch (err) {
      console.error('Pluto chat generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleListen = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      if (interimTranscript.trim()) {
        handleSendMessage(interimTranscript);
      }
    } else {
      speechService.stopSpeaking();
      setIsSpeaking(false);

      const started = speechService.startListening(language, {
        onStart: () => {
          setIsListening(true);
          setEmotion('empathetic');
        },
        onResult: (transcript, isFinal) => {
          setInterimTranscript(transcript);
          if (isFinal && transcript.trim().length > 1) {
            setIsListening(false);
            handleSendMessage(transcript);
          }
        },
        onError: (err) => {
          console.warn('Voice recognition error:', err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });

      if (!started) {
        alert('Voice recognition could not be started. You can also type in the text box below.');
      }
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Clear your conversation history with Pluto?')) {
      await db.chatHistory.clear();
      setMessages([]);
    }
  };

  // Dynamic starter prompts
  const conversationStarters = [
    'I have 3 exams this week and feel overwhelmed.',
    'Why do I feel so tired even when I slept 7 hours?',
    'Help me prioritize my study blocks for today.',
    'I am procrastinating on a paper due tomorrow.',
    'How do I wind down when my brain is racing?',
  ];

  // Latest follow-up suggestions from the most recent assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.sender === 'assistant');
  const activeFollowUps = lastAssistantMessage?.followUpSuggestions || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-12rem)] animate-fadeIn">
      {/* Left Column: 3D Pluto Companion Interactive Stage */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="relative flex-1 min-h-[400px] lg:min-h-[480px] rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 border border-cyan-500/25 p-4 overflow-hidden backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center">
          {/* 3D Pluto Avatar Viewport */}
          <AvatarScene
            isSpeaking={isSpeaking}
            isListening={isListening}
            emotion={emotion}
            lipSyncAmplitude={lipSyncAmplitude}
            modelStyle={settings?.avatarModel || 'stylized_human'}
          />

          {/* Audio Visualizer Waveform footer */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/85 border border-cyan-500/25 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">
                {isSpeaking ? 'Pluto is Speaking' : isListening ? 'Pluto is Listening...' : 'Pluto is Ready'}
              </span>
            </div>

            <WaveVisualizer
              isActive={isSpeaking || isListening}
              color={isSpeaking ? 'cyan' : isListening ? 'violet' : 'teal'}
              bars={7}
            />
          </div>
        </div>

        {/* Voice Controls Toolbar */}
        <VoiceControls
          isListening={isListening}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          language={language}
          interimTranscript={interimTranscript}
          onToggleListen={handleToggleListen}
          onToggleMute={() => {
            if (!isMuted && isSpeaking) speechService.stopSpeaking();
            setIsMuted(!isMuted);
          }}
          onSelectLanguage={(lang) => setLanguage(lang)}
        />
      </div>

      {/* Right Column: Conversational Reflection Window */}
      <div className="lg:col-span-7 flex flex-col rounded-3xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-2xl p-5 md:p-6 shadow-2xl h-[580px] lg:h-auto">
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 p-0.5 shadow-md shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                <Bot className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Pluto
                </h3>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/90 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  3D AI Companion
                </span>
                <span className="text-[10px] font-semibold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-500/30">
                  {settings?.geminiApiKey ? 'Gemini 2.5 Flash' : 'Local Mind Engine'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Conversing with {userProfile?.fullName || 'Student'} • {userProfile?.major || 'Academic Explorer'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-400">
                  {isUser ? (
                    <>
                      <span>{userProfile?.fullName || 'You'}</span>
                      <User className="w-3 h-3 text-cyan-400" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-300 font-bold">Pluto</span>
                    </>
                  )}
                </div>

                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-950/85 border border-slate-800/90 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Extracted Action Pill */}
                  {msg.extractedActions && msg.extractedActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                      <p className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Actionable Suggestion:</span>
                      </p>
                      {msg.extractedActions.map((act, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-teal-950/40 border border-teal-500/20 text-xs text-teal-200"
                        >
                          <span>{act}</span>
                          <button
                            onClick={() => onAddTaskToPlanner(act)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-[10px] transition-colors"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Add to Planner</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-up suggestions inside message */}
                  {!isUser && msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3 text-cyan-400" />
                        <span>Continue conversing with Pluto:</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followUpSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(suggestion)}
                            className="text-left px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950/60 text-[11px] text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors"
                          >
                            "{suggestion}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs w-max animate-pulse">
              <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Pluto is reflecting on what you said...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Conversational Starter Chips */}
        <div className="py-2 overflow-x-auto flex items-center gap-2 border-t border-slate-800/60 no-scrollbar">
          {activeFollowUps.length > 0 ? (
            activeFollowUps.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 text-[11px] text-cyan-200 border border-cyan-500/30 transition-colors flex items-center gap-1"
              >
                <span>💬</span>
                <span>{prompt}</span>
              </button>
            ))
          ) : (
            conversationStarters.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-700/80 text-[11px] text-slate-300 border border-slate-700/60 transition-colors"
              >
                {prompt}
              </button>
            ))
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="pt-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Talk with Pluto... (e.g. "I'm feeling stuck on my problem set")`}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
