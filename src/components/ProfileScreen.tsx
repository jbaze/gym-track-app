import { useState } from "react";
import {
  User, Settings, LogOut, ChevronRight, Dumbbell, Trophy,
  Flame, Calendar, Weight, Clock, Search, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserProfile, CompletedWorkout, Exercise,
  EXERCISE_DATABASE, MUSCLE_GROUPS, EQUIPMENT_TYPES,
  saveProfile, setOnboarded, getCurrentStreak, formatDuration,
} from "@/lib/gymData";

interface ProfileScreenProps {
  profile: UserProfile;
  history: CompletedWorkout[];
  onProfileUpdate: (profile: UserProfile) => void;
  onLogout: () => void;
}

type View = "profile" | "settings" | "library" | "exercise-detail";

const fitnessGoals = ["Strength", "Hypertrophy", "Endurance", "Weight Loss"] as const;
const experienceLevels = ["Beginner", "Intermediate", "Advanced"] as const;

export default function ProfileScreen({ profile, history, onProfileUpdate, onLogout }: ProfileScreenProps) {
  const [view, setView] = useState<View>("profile");
  const [editGoal, setEditGoal] = useState(profile.fitnessGoal);
  const [editLevel, setEditLevel] = useState(profile.experienceLevel);
  const [editUnit, setEditUnit] = useState(profile.weightUnit);
  const [editRestTimer, setEditRestTimer] = useState(profile.restTimerDuration.toString());

  // Library state
  const [libSearch, setLibSearch] = useState("");
  const [libMuscle, setLibMuscle] = useState<string | null>(null);
  const [libEquipment, setLibEquipment] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const totalWorkouts = history.length;
  const totalVolume = history.reduce((sum, w) => sum + w.totalVolume, 0);
  const currentStreak = getCurrentStreak();
  const totalDuration = history.reduce((sum, w) => sum + w.duration, 0);
  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handleSaveSettings = () => {
    const updated: UserProfile = {
      ...profile,
      fitnessGoal: editGoal,
      experienceLevel: editLevel,
      weightUnit: editUnit,
      restTimerDuration: parseInt(editRestTimer) || 90,
    };
    saveProfile(updated);
    onProfileUpdate(updated);
    setView("profile");
  };

  // Library filtering
  const filteredExercises = EXERCISE_DATABASE.filter((e) => {
    if (libSearch && !e.name.toLowerCase().includes(libSearch.toLowerCase())) return false;
    if (libMuscle && e.primaryMuscle !== libMuscle) return false;
    if (libEquipment && e.equipment !== libEquipment) return false;
    return true;
  });

  // ---------- EXERCISE DETAIL ----------
  if (view === "exercise-detail" && selectedExercise) {
    return (
      <div className="safe-bottom px-4 pt-2 pb-4 animate-slide-up">
        <button
          onClick={() => { setSelectedExercise(null); setView("library"); }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4 touch-target"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Library
        </button>

        <div className="space-y-4">
          <div className="bg-card border border-white/5 rounded-2xl p-5">
            <div className="w-14 h-14 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center mb-4">
              <Dumbbell className="w-7 h-7 text-[#6C5CE7]" />
            </div>
            <h1 className="text-xl font-bold">{selectedExercise.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs bg-[#6C5CE7]/10 text-[#A29BFE] px-2.5 py-1 rounded-full font-medium">
                {selectedExercise.primaryMuscle}
              </span>
              {selectedExercise.secondaryMuscles.map((m) => (
                <span key={m} className="text-xs bg-white/5 text-muted-foreground px-2.5 py-1 rounded-full">
                  {m}
                </span>
              ))}
              <span className="text-xs bg-white/5 text-muted-foreground px-2.5 py-1 rounded-full">
                {selectedExercise.equipment}
              </span>
            </div>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">How to Perform</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{selectedExercise.description}</p>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">Muscle Diagram</h3>
            <div className="h-32 bg-white/5 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Muscle visualization placeholder</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- EXERCISE LIBRARY ----------
  if (view === "library") {
    return (
      <div className="safe-bottom px-4 pt-2 pb-4 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setView("profile")}
            className="touch-target flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold">Exercise Library</h1>
          <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
            {EXERCISE_DATABASE.length} exercises
          </span>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={libSearch}
            onChange={(e) => setLibSearch(e.target.value)}
            placeholder="Search exercises..."
            className="pl-10 h-11 bg-card border-white/10 rounded-xl"
          />
        </div>

        {/* Muscle filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2">
          <button
            onClick={() => setLibMuscle(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !libMuscle ? "gym-gradient text-white" : "bg-white/5 text-muted-foreground"
            }`}
          >
            All Muscles
          </button>
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              onClick={() => setLibMuscle(m === libMuscle ? null : m)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                libMuscle === m ? "gym-gradient text-white" : "bg-white/5 text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Equipment filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          {EQUIPMENT_TYPES.map((eq) => (
            <button
              key={eq}
              onClick={() => setLibEquipment(eq === libEquipment ? null : eq)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                libEquipment === eq ? "bg-[#00E676]/20 text-[#00E676]" : "bg-white/5 text-muted-foreground"
              }`}
            >
              {eq}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-2">{filteredExercises.length} results</p>

        <div className="space-y-1">
          {filteredExercises.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => { setSelectedExercise(exercise); setView("exercise-detail"); }}
              className="w-full flex items-center gap-3 py-3 border-b border-white/5 text-left active:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
                <Dumbbell className="w-4 h-4 text-[#6C5CE7]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{exercise.name}</p>
                <p className="text-xs text-muted-foreground">
                  {exercise.primaryMuscle}
                  {exercise.secondaryMuscles.length > 0 && ` · ${exercise.secondaryMuscles[0]}`}
                  {" · "}{exercise.equipment}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- SETTINGS ----------
  if (view === "settings") {
    return (
      <div className="safe-bottom px-4 pt-2 pb-4 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("profile")} className="touch-target flex items-center justify-center">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Fitness Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {fitnessGoals.map((g) => (
                <button
                  key={g}
                  onClick={() => setEditGoal(g)}
                  className={`h-11 rounded-xl text-sm font-medium transition-all touch-target ${
                    editGoal === g
                      ? "gym-gradient text-white"
                      : "bg-card border border-white/10 text-white/70"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Experience Level</label>
            <div className="grid grid-cols-3 gap-2">
              {experienceLevels.map((l) => (
                <button
                  key={l}
                  onClick={() => setEditLevel(l)}
                  className={`h-11 rounded-xl text-sm font-medium transition-all touch-target ${
                    editLevel === l
                      ? "gym-gradient text-white"
                      : "bg-card border border-white/10 text-white/70"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Weight Unit</label>
            <div className="grid grid-cols-2 gap-2">
              {(["kg", "lbs"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setEditUnit(u)}
                  className={`h-11 rounded-xl text-sm font-medium transition-all touch-target ${
                    editUnit === u
                      ? "gym-gradient text-white"
                      : "bg-card border border-white/10 text-white/70"
                  }`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Default Rest Timer (seconds)</label>
            <Input
              type="number"
              value={editRestTimer}
              onChange={(e) => setEditRestTimer(e.target.value)}
              className="h-11 bg-card border-white/10 rounded-xl"
            />
          </div>

          <Button
            onClick={handleSaveSettings}
            className="w-full h-12 gym-gradient text-white font-semibold rounded-xl hover:opacity-90"
          >
            Save Settings
          </Button>
        </div>
      </div>
    );
  }

  // ---------- MAIN PROFILE ----------
  return (
    <div className="safe-bottom px-4 pt-2 pb-4 animate-slide-up">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full gym-gradient flex items-center justify-center text-2xl font-bold">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs bg-[#6C5CE7]/10 text-[#A29BFE] px-2 py-0.5 rounded-full font-medium">
              {profile.fitnessGoal}
            </span>
            <span className="text-xs bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full">
              {profile.experienceLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-[#6C5CE7]" />
          </div>
          <div>
            <p className="text-lg font-bold">{totalWorkouts}</p>
            <p className="text-[11px] text-muted-foreground">Workouts</p>
          </div>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00E676]/10 flex items-center justify-center">
            <Weight className="w-5 h-5 text-[#00E676]" />
          </div>
          <div>
            <p className="text-lg font-bold">
              {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            </p>
            <p className="text-[11px] text-muted-foreground">{profile.weightUnit} Lifted</p>
          </div>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-bold">{currentStreak}</p>
            <p className="text-[11px] text-muted-foreground">Day Streak</p>
          </div>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFD93D]/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#FFD93D]" />
          </div>
          <div>
            <p className="text-lg font-bold">{formatDuration(totalDuration)}</p>
            <p className="text-[11px] text-muted-foreground">Total Time</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="space-y-1 mb-6">
        <button
          onClick={() => setView("library")}
          className="w-full flex items-center gap-3 bg-card border border-white/5 rounded-xl p-4 active:bg-white/5 transition-colors"
        >
          <Dumbbell className="w-5 h-5 text-[#6C5CE7]" />
          <span className="flex-1 text-left font-medium text-sm">Exercise Library</span>
          <span className="text-xs text-muted-foreground mr-1">{EXERCISE_DATABASE.length} exercises</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => setView("settings")}
          className="w-full flex items-center gap-3 bg-card border border-white/5 rounded-xl p-4 active:bg-white/5 transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 text-left font-medium text-sm">Settings</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Achievements placeholder */}
      <div className="bg-card border border-white/5 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-[#FFD93D]" />
          <h3 className="font-semibold text-sm">Achievements</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: "🏋️", label: "First Lift", unlocked: totalWorkouts >= 1 },
            { icon: "🔥", label: "3-Day Streak", unlocked: currentStreak >= 3 },
            { icon: "💪", label: "10 Workouts", unlocked: totalWorkouts >= 10 },
            { icon: "🏆", label: "1000kg Club", unlocked: totalVolume >= 1000 },
          ].map((a, i) => (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
                a.unlocked ? "bg-[#FFD93D]/10" : "bg-white/5 opacity-40"
              }`}
            >
              <span className="text-xl">{a.icon}</span>
              <span className="text-[10px] text-center text-muted-foreground">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <Button
        onClick={onLogout}
        variant="outline"
        className="w-full h-12 border-red-500/20 text-red-400 font-medium rounded-xl hover:bg-red-500/10"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Log Out
      </Button>
    </div>
  );
}