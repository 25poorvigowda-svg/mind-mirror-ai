import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  CalendarCheck,
  Bot,
  LineChart,
  ListTodo,
  Compass,
  ShieldCheck,
  PlusCircle,
  User,
  LogIn,
} from 'lucide-react';
import type { UserProfile } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'checkin'
  | 'companion'
  | 'insights'
  | 'planner'
  | 'experiment'
  | 'profile'
  | 'settings'
  | 'login';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hasCheckedInToday: boolean;
  userProfile?: UserProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  hasCheckedInToday,
  userProfile,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'companion', label: 'Pluto 3D', icon: <Bot className="w-4 h-4" /> },
    { id: 'checkin', label: 'Check-in', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights', icon: <LineChart className="w-4 h-4" /> },
    { id: 'planner', label: 'Action Planner', icon: <ListTodo className="w-4 h-4" /> },
    { id: 'experiment', label: '7-Day Challenge', icon: <Compass className="w-4 h-4" /> },
    { id: 'profile', label: 'User Details', icon: <User className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-slate-950/90 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                  Mind Mirror
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                  AI
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 font-normal">
                Understand Your Patterns. Reflect. Take Your Next Step.
              </p>
            </div>
          </div>

          {/* Nav Items (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5">
            {/* User Details Pill */}
            {userProfile?.isLoggedIn ? (
              <button
                onClick={() => onSelectTab('profile')}
                className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                  activeTab === 'profile'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-md'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="View User Details"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-black text-slate-950">
                  {userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold leading-tight">{userProfile.fullName.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{userProfile.major.split('&')[0]}</div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => onSelectTab('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign In</span>
              </button>
            )}

            {/* Quick Check-in Trigger */}
            <button
              onClick={() => onSelectTab('checkin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                hasCheckedInToday
                  ? 'bg-slate-900 text-teal-300 border border-teal-500/30 hover:bg-slate-800'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-md shadow-cyan-500/20 animate-pulse'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{hasCheckedInToday ? 'Update Today' : 'Daily Check-in'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Bar (Mobile & Smaller screens) */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-900 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
