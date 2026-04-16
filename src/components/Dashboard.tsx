import { useMemo } from "react";
import { Play, ChevronRight, Flame, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UserProfile,
  CompletedWorkout,
  WorkoutType,
  getSuggestedWorkoutType,
  getWeekStreak,
  formatDuration,
  WORKOUT_TYPES,
} from "@/lib/gymData";

interface DashboardProps {
  profile: UserProfile;
  history: CompletedWorkout[];
  onStartWorkout: (type?: WorkoutType) => void;
  currentStreak: number;
}

export default function Dashboard({ profile, history, onStartWorkout, currentStreak }: DashboardProps) {
  const suggestedType = useMemo(() => getSuggestedWorkoutType(), [history]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekStreak = useMemo(() => getWeekStreak(), [history]); // eslint-disable-line react-hooks/exhaustive-deps
  const recentWorkouts = history.slice(0, 3);
  const suggestedInfo = WORKOUT_TYPES.find((t) => t.type === suggestedType);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const totalVolume = history.reduce((sum, w) => sum + w.totalVolume, 0);

  return (
    <div className="safe-bottom px-4 pt-2 pb-4 space-y-6 animate-slide-up">
      {/* Greeting */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{dateStr}</p>
        <h1 className="text-2xl font-bold">
          Hey, {profile.name} <span className="inline-block animate-bounce">👋</span>
        </h1>
      </div>

      {/* Start Workout CTA */}
      <button
        onClick={() => onStartWorkout()}
        className="w-full relative overflow-hidden rounded-2xl p-5 gym-gradient group transition-all active:scale-[0.98]"
      >
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
        <div className="flex items-center justify-between relative z-10">
          <div className="text-left">
            <p className="text-white/80 text-sm font-medium">Ready to train?</p>
            <p className="text-white text-xl font-bold mt-1">Start Workout</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="w-7 h-7 text-white fill-white ml-0.5" />
          </div>
        </div>
      </button>

      {/* Suggested Workout */}
      {suggestedInfo && (
        <button
          onClick={() => onStartWorkout(suggestedType)}
          className="w-full bg-card border border-white/5 rounded-2xl p-4 flex items-center gap-4 active:bg-white/5 transition-colors text-left"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: suggestedInfo.color + "20" }}
          >
            {suggestedInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Suggested Today</p>
            <p className="text-base font-semibold mt-0.5">{suggestedType} Day</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {suggestedInfo.muscleGroups.join(" · ")} · {suggestedInfo.estimatedDuration}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      )}

      {/* Week Streak */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#6C5CE7]" />
            This Week
          </h2>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="font-semibold text-orange-400">{currentStreak} day streak</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {weekStreak.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground font-medium">{day.day}</span>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  day.done
                    ? "gym-gradient text-white shadow-lg shadow-purple-500/20"
                    : i === 6
                    ? "border-2 border-dashed border-[#6C5CE7]/50 text-muted-foreground"
                    : "bg-white/5 text-muted-foreground/50"
                }`}
              >
                {day.done ? "✓" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-white/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold">{history.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Workouts</p>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold">
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{profile.weightUnit} Lifted</p>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold">{currentStreak}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Day Streak</p>
        </div>
      </div>

      {/* Recent Workouts */}
      {recentWorkouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6C5CE7]" />
            Recent Workouts
          </h2>
          <div className="space-y-2">
            {recentWorkouts.map((workout) => {
              const typeInfo = WORKOUT_TYPES.find((t) => t.type === workout.type);
              return (
                <div
                  key={workout.id}
                  className="bg-card border border-white/5 rounded-xl p-4 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: (typeInfo?.color || "#6C5CE7") + "20" }}
                  >
                    {typeInfo?.icon || "💪"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{workout.type} Day</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(workout.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {formatDuration(workout.duration)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{workout.totalSets} sets</p>
                    <p className="text-xs text-muted-foreground">
                      {workout.totalVolume.toLocaleString()} {profile.weightUnit}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && (
        <div className="bg-card border border-white/5 rounded-2xl p-8 text-center space-y-3">
          <div className="text-4xl">🏋️</div>
          <p className="font-semibold">No workouts yet</p>
          <p className="text-sm text-muted-foreground">
            Start your first workout to begin tracking your progress!
          </p>
          <Button
            onClick={() => onStartWorkout()}
            className="gym-gradient text-white font-semibold rounded-xl h-11 px-6 hover:opacity-90"
          >
            Start First Workout
          </Button>
        </div>
      )}
    </div>
  );
}