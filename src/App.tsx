import { useState, useEffect, useCallback } from 'react';
import type { DailyCheckIn, ActionTask, ExperimentDay, UserSettings, UserProfile } from './types';
import {
  db,
  getSettings,
  initExperimentDays,
  seedRealisticDemoData,
  getUserProfile,
  DEFAULT_SETTINGS,
  DEFAULT_USER_PROFILE,
} from './services/db';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { SpaceBackground3D } from './components/companion/SpaceBackground3D';
import { DashboardView } from './views/DashboardView';
import { CheckInView } from './views/CheckInView';
import { InsightsView } from './views/InsightsView';
import { CompanionView } from './views/CompanionView';
import { PlannerView } from './views/PlannerView';
import { ExperimentView } from './views/ExperimentView';
import { ProfileView } from './views/ProfileView';
import { LoginView } from './views/LoginView';
import { SettingsView } from './views/SettingsView';
import confetti from 'canvas-confetti';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [experimentDays, setExperimentDays] = useState<ExperimentDay[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  // Load all data from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);

      const loadedProfile = await getUserProfile();
      setUserProfile(loadedProfile);

      const loadedExperimentDays = await initExperimentDays();
      setExperimentDays(loadedExperimentDays);

      const loadedCheckIns = await db.checkIns.orderBy('timestamp').reverse().toArray();
      setCheckIns(loadedCheckIns);

      const loadedTasks = await db.actionTasks.orderBy('createdAt').reverse().toArray();
      setTasks(loadedTasks);
    } catch (err) {
      console.error('Failed to load database records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Check if user has already checked in today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIn = checkIns.find((c) => c.date === todayStr);

  const handleSeedDemoData = async () => {
    setIsLoading(true);
    await seedRealisticDemoData();
    await reloadData();
    confetti({
      particleCount: 60,
      spread: 70,
      colors: ['#06b6d4', '#14b8a6', '#8b5cf6'],
    });
    alert('14 Days of realistic student data loaded successfully! You can now explore all correlations, Pluto 3D voice interactions, and insight charts.');
  };

  const handleAddTaskFromCompanion = async (title: string) => {
    const newTask: ActionTask = {
      title,
      category: 'productivity',
      priority: 'high',
      completed: false,
      origin: 'ai_suggested',
      createdAt: Date.now(),
    };
    await db.actionTasks.add(newTask);
    await reloadData();
    alert(`Added micro-action to your Action Planner: "${title}"`);
  };

  const handleLogout = () => {
    setUserProfile((prev) => ({ ...prev, isLoggedIn: false }));
    setActiveTab('login');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setUserProfile(user);
    setActiveTab('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center gap-4 text-cyan-400">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading Mind Mirror AI & Pluto 3D...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden">
      {/* Interactive 3D Cosmic Celestial Background Canvas */}
      <SpaceBackground3D />

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        hasCheckedInToday={!!todayCheckIn}
        userProfile={userProfile}
      />

      {/* Main Multi-Page Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'login' && (
          <LoginView onLoginSuccess={handleLoginSuccess} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            userProfile={userProfile}
            checkIns={checkIns}
            onProfileUpdated={(updated) => setUserProfile(updated)}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            checkIns={checkIns}
            todayCheckIn={todayCheckIn}
            experimentDays={experimentDays}
            tasks={tasks}
            userProfile={userProfile}
            onNavigate={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSeedDemoData={handleSeedDemoData}
          />
        )}

        {activeTab === 'companion' && (
          <CompanionView
            latestCheckIn={todayCheckIn || checkIns[0]}
            settings={settings}
            userProfile={userProfile}
            onAddTaskToPlanner={handleAddTaskFromCompanion}
          />
        )}

        {activeTab === 'checkin' && (
          <CheckInView
            checkIns={checkIns}
            onCheckInSaved={reloadData}
            settings={settings}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView checkIns={checkIns} />
        )}

        {activeTab === 'planner' && (
          <PlannerView
            tasks={tasks}
            onTasksChanged={reloadData}
          />
        )}

        {activeTab === 'experiment' && (
          <ExperimentView
            experimentDays={experimentDays}
            onExperimentUpdated={reloadData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSettingsChanged={reloadData}
            onSeedDemoData={handleSeedDemoData}
          />
        )}
      </main>

      {/* Footer with Ethical Disclaimers */}
      <Footer />
    </div>
  );
}

export default App;
