import { useState, useEffect, useCallback } from "react";
import { Home, ClockArrowUp, TrendingUp, UserRound } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AuthScreen from "@/components/AuthScreen";
import OnboardingFlow from "@/components/OnboardingFlow";
import Dashboard from "@/components/Dashboard";
import WorkoutFlow from "@/components/WorkoutFlow";
import HistoryScreen from "@/components/HistoryScreen";
import ProgressScreen from "@/components/ProgressScreen";
import ProfileScreen from "@/components/ProfileScreen";
import {
  UserProfile, CompletedWorkout, WorkoutType, ActiveWorkout,
  loadWorkoutHistory, saveWorkoutHistory,
  loadActiveWorkout, saveActiveWorkout,
  getCurrentStreak,
} from "@/lib/gymData";
import { fetchProfile, upsertProfile } from "@/lib/gymData";

type Tab = "home" | "history" | "progress" | "profile";
type AppScreen = "onboarding" | "main" | "workout";

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [screen, setScreen] = useState<AppScreen>("main");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [history, setHistory] = useState<CompletedWorkout[]>(loadWorkoutHistory());
  const [workoutType, setWorkoutType] = useState<WorkoutType | undefined>();
  const [resumeWorkout, setResumeWorkout] = useState<ActiveWorkout | null>(null);
  const [currentStreak, setCurrentStreak] = useState(getCurrentStreak());

  // Load Supabase profile after session established
  const loadSupabaseProfile = useCallback(async () => {
    setProfileLoading(true);
    const dbProfile = await fetchProfile();
    if (dbProfile) {
      const mapped: UserProfile = {
        name: dbProfile.name ?? "Athlete",
        fitnessGoal: (dbProfile.fitness_goal as UserProfile["fitnessGoal"]) ?? "Hypertrophy",
        experienceLevel: (dbProfile.experience_level as UserProfile["experienceLevel"]) ?? "Intermediate",
        weightUnit: dbProfile.weight_unit as "kg" | "lbs",
        restTimerDuration: dbProfile.default_rest_seconds ?? 90,
        createdAt: new Date(dbProfile.created_at).getTime(),
      };
      setProfile(mapped);
      // Restore in-progress workout first — takes priority over the normal home screen
      const active = loadActiveWorkout();
      if (active) {
        setResumeWorkout(active);
        setScreen("workout");
      } else {
        setScreen("main");
      }
    } else {
      setProfile(null);
      setScreen("onboarding");
    }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) loadSupabaseProfile();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadSupabaseProfile();
      } else {
        setProfile(null);
        setScreen("main");
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSupabaseProfile]);

  const handleOnboardingComplete = useCallback(async (newProfile: UserProfile) => {
    // Save to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await upsertProfile({
        id: user.id,
        name: newProfile.name,
        fitness_goal: newProfile.fitnessGoal.toLowerCase().replace(" ", "_") as any,
        experience_level: newProfile.experienceLevel.toLowerCase() as any,
        weight_unit: newProfile.weightUnit,
        default_rest_seconds: newProfile.restTimerDuration,
      });
    }
    setProfile(newProfile);
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

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  // --- RENDER STATES ---

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-2 border-[#6C5CE7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (screen === "onboarding" || !profile) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (screen === "workout") {
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home",     label: "Home",     icon: <Home className="w-5 h-5" /> },
    { id: "history",  label: "History",  icon: <ClockArrowUp className="w-5 h-5" /> },
    { id: "progress", label: "Progress", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "profile",  label: "Profile",  icon: <UserRound className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      <div className="pb-20">
        {activeTab === "home" && (
          <Dashboard profile={profile} history={history} onStartWorkout={handleStartWorkout} currentStreak={currentStreak} />
        )}
        {activeTab === "history" && (
          <HistoryScreen history={history} profile={profile} />
        )}
        {activeTab === "progress" && (
          <ProgressScreen history={history} profile={profile} />
        )}
        {activeTab === "profile" && (
          <ProfileScreen profile={profile} history={history} onProfileUpdate={handleProfileUpdate} onLogout={handleLogout} />
        )}
      </div>

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
                  {isActive && <div className="w-1 h-1 rounded-full bg-[#6C5CE7] mt-0.5" />}
                </button>
              );
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom,0px)]" />
        </div>
      </nav>
    </div>
  );
}
