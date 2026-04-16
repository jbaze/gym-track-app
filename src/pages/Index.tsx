import { useState, useEffect, useCallback } from "react";
import { Home, ClockArrowUp, TrendingUp, UserRound } from "lucide-react";
import OnboardingFlow from "@/components/OnboardingFlow";
import Dashboard from "@/components/Dashboard";
import WorkoutFlow from "@/components/WorkoutFlow";
import HistoryScreen from "@/components/HistoryScreen";
import ProgressScreen from "@/components/ProgressScreen";
import ProfileScreen from "@/components/ProfileScreen";
import {
  UserProfile, CompletedWorkout, WorkoutType, ActiveWorkout,
  isOnboarded, loadProfile, loadWorkoutHistory, saveWorkoutHistory,
  loadActiveWorkout, saveActiveWorkout, setOnboarded as setOnboardedStorage,
  getCurrentStreak,
} from "@/lib/gymData";

type Tab = "home" | "history" | "progress" | "profile";
type AppScreen = "onboarding" | "main" | "workout";

export default function Index() {
  const [screen, setScreen] = useState<AppScreen>(() => (isOnboarded() ? "main" : "onboarding"));
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile());
  const [history, setHistory] = useState<CompletedWorkout[]>(loadWorkoutHistory());
  const [workoutType, setWorkoutType] = useState<WorkoutType | undefined>();
  const [resumeWorkout, setResumeWorkout] = useState<ActiveWorkout | null>(loadActiveWorkout());
  const [currentStreak, setCurrentStreak] = useState(getCurrentStreak());

  // Check for active workout on mount
  useEffect(() => {
    const active = loadActiveWorkout();
    if (active) {
      setResumeWorkout(active);
      setScreen("workout");
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setProfile(loadProfile());
    setScreen("main");
  }, []);

  const handleStartWorkout = useCallback((type?: WorkoutType) => {
    setWorkoutType(type);
    setResumeWorkout(null);
    setScreen("workout");
  }, []);

  const handleWorkoutComplete = useCallback((workout: CompletedWorkout) => {
    const updated = [workout, ...history];
    setHistory(updated);
    saveWorkoutHistory(updated);
    saveActiveWorkout(null);
    setResumeWorkout(null);
    setCurrentStreak(getCurrentStreak());
    setScreen("main");
    setActiveTab("home");
  }, [history]);

  const handleWorkoutCancel = useCallback(() => {
    saveActiveWorkout(null);
    setResumeWorkout(null);
    setScreen("main");
  }, []);

  const handleProfileUpdate = useCallback((updated: UserProfile) => {
    setProfile(updated);
  }, []);

  const handleLogout = useCallback(() => {
    setOnboardedStorage(false);
    setProfile(null);
    setScreen("onboarding");
  }, []);

  // ---------- ONBOARDING ----------
  if (screen === "onboarding") {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // ---------- ACTIVE WORKOUT ----------
  if (screen === "workout" && profile) {
    return (
      <WorkoutFlow
        profile={profile}
        initialType={workoutType}
        onComplete={handleWorkoutComplete}
        onCancel={handleWorkoutCancel}
        resumeWorkout={resumeWorkout}
      />
    );
  }

  if (!profile) return null;

  // ---------- MAIN APP WITH TABS ----------
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
    { id: "history", label: "History", icon: <ClockArrowUp className="w-5 h-5" /> },
    { id: "progress", label: "Progress", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "profile", label: "Profile", icon: <UserRound className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {/* Screen content */}
      <div className="pb-20">
        {activeTab === "home" && (
          <Dashboard
            profile={profile}
            history={history}
            onStartWorkout={handleStartWorkout}
            currentStreak={currentStreak}
          />
        )}
        {activeTab === "history" && (
          <HistoryScreen history={history} profile={profile} />
        )}
        {activeTab === "progress" && (
          <ProgressScreen history={history} profile={profile} />
        )}
        {activeTab === "profile" && (
          <ProfileScreen
            profile={profile}
            history={history}
            onProfileUpdate={handleProfileUpdate}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto glass-effect border-t border-white/5">
          <div className="flex items-center justify-around px-2 py-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all touch-target ${
                    isActive ? "text-[#6C5CE7]" : "text-muted-foreground"
                  }`}
                >
                  <div className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                    {tab.icon}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-[#6C5CE7]" : ""}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-[#6C5CE7] mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
          {/* Safe area spacer for iOS */}
          <div className="h-[env(safe-area-inset-bottom,0px)]" />
        </div>
      </nav>
    </div>
  );
}