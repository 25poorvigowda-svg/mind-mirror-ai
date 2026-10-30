export type MoodRating = 1 | 2 | 3 | 4 | 5;
export type EnergyRating = 1 | 2 | 3 | 4 | 5;
export type StressRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type WorkloadLevel = 'low' | 'medium' | 'high';

export interface UserProfile {
  id?: number;
  email: string;
  fullName: string;
  institution: string; // e.g., 'Stanford University'
  major: string; // e.g., 'Cognitive Science & Computer Science'
  academicYear: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate';
  targetSleepHours: number; // e.g., 7.5 or 8.0
  primaryGoal: string;
  joinedDate: string;
  avatarColor: string;
  isLoggedIn: boolean;
}

export interface AcademicTask {
  id: string;
  title: string;
  completed: boolean;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface DailyCheckIn {
  id?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  timestamp: number;
  mood: MoodRating;
  sleepHours: number;
  energy: EnergyRating;
  stress: StressRating;
  workload: WorkloadLevel;
  journal: string;
  tasks: AcademicTask[];
  aiReflection?: string;
  aiSuggestedActions?: string[];
  tags?: string[];
}

export interface ActionTask {
  id?: number;
  title: string;
  description?: string;
  category: 'academic' | 'wellness' | 'sleep' | 'mindfulness' | 'productivity';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dueDate?: string;
  origin: 'manual' | 'ai_suggested';
  completedAt?: number;
  createdAt: number;
}

export interface ExperimentDay {
  day: number;
  title: string;
  theme: string;
  objective: string;
  prompt: string;
  actionGuidance: string;
  reflectionQuestion: string;
  completed: boolean;
  completedDate?: string;
  userNotes?: string;
}

export interface UserSettings {
  id?: number;
  userName: string;
  language: string; // 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN', 'ja-JP'
  geminiApiKey: string;
  ttsVoice: string;
  ttsSpeed: number; // 0.8 - 1.2
  avatarModel: 'stylized_human' | 'robot_expressive';
  soundEnabled: boolean;
  seededDemoData: boolean;
  disclaimerAcknowledged: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  language?: string;
  extractedActions?: string[];
  followUpSuggestions?: string[];
  emotion?: 'calm' | 'empathetic' | 'encouraging' | 'thoughtful' | 'celebratory';
}

export interface CorrelationInsight {
  variableA: string;
  variableB: string;
  coefficient: number; // -1 to 1
  strength: 'strong_positive' | 'moderate_positive' | 'weak_positive' | 'none' | 'weak_negative' | 'moderate_negative' | 'strong_negative';
  description: string;
  evidenceText: string;
  practicalTip: string;
}

export interface StatisticalSummary {
  totalCheckIns: number;
  dateRange: { start: string; end: string } | null;
  dataCoveragePercent: number;
  avgMood: number;
  avgSleep: number;
  avgEnergy: number;
  avgStress: number;
  workloadDistribution: { low: number; medium: number; high: number };
  currentStreak: number;
  longestStreak: number;
  correlations: CorrelationInsight[];
}
