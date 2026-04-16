import { useState } from "react";
import { Search, Filter, ChevronDown, ChevronUp, Calendar, Clock, Dumbbell, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  CompletedWorkout, UserProfile, WorkoutType, WORKOUT_TYPES, formatDuration,
} from "@/lib/gymData";

interface HistoryScreenProps {
  history: CompletedWorkout[];
  profile: UserProfile;
}

export default function HistoryScreen({ history, profile }: HistoryScreenProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkoutType | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const unit = profile.weightUnit;

  const filtered = history.filter((w) => {
    if (typeFilter && w.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        w.type.toLowerCase().includes(q) ||
        w.exercises.some((e) => e.exerciseName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="safe-bottom px-4 pt-2 pb-4 animate-slide-up">
      <h1 className="text-2xl font-bold mb-4">History</h1>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workouts..."
          className="pl-10 h-11 bg-card border-white/10 rounded-xl"
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-3 touch-target"
      >
        <Filter className="w-4 h-4" />
        Filter by type
        {typeFilter && (
          <span className="bg-[#6C5CE7] text-white text-xs px-2 py-0.5 rounded-full">{typeFilter}</span>
        )}
      </button>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 animate-slide-up">
          {typeFilter && (
            <button
              onClick={() => setTypeFilter(null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400"
            >
              Clear <X className="w-3 h-3" />
            </button>
          )}
          {WORKOUT_TYPES.filter((t) => t.type !== "Custom").map((t) => (
            <button
              key={t.type}
              onClick={() => setTypeFilter(t.type === typeFilter ? null : t.type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                typeFilter === t.type
                  ? "gym-gradient text-white"
                  : "bg-white/5 text-muted-foreground"
              }`}
            >
              {t.icon} {t.type}
            </button>
          ))}
        </div>
      )}

      {/* Workout list */}
      <div className="space-y-2">
        {filtered.map((workout) => {
          const typeInfo = WORKOUT_TYPES.find((t) => t.type === workout.type);
          const isExpanded = expandedId === workout.id;

          return (
            <div key={workout.id} className="bg-card border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : workout.id)}
                className="w-full p-4 flex items-center gap-3 text-left active:bg-white/5 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: (typeInfo?.color || "#6C5CE7") + "20" }}
                >
                  {typeInfo?.icon || "💪"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{workout.type} Day</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(workout.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(workout.duration)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 mr-2">
                  <p className="text-sm font-semibold">{workout.totalSets} sets</p>
                  <p className="text-xs text-muted-foreground">{workout.totalVolume.toLocaleString()} {unit}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3 animate-slide-up">
                  {workout.exercises.map((ex, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                        <Dumbbell className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{ex.exerciseName}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {ex.sets.map((s, j) => (
                            <span key={j} className="text-xs bg-white/5 rounded px-2 py-0.5 text-muted-foreground">
                              {s.weight > 0 ? `${s.weight}${unit} × ` : ""}{s.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {workout.note && (
                    <div className="mt-2 bg-white/5 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground">📝 {workout.note}</p>
                    </div>
                  )}
                  {workout.personalRecords.length > 0 && (
                    <div className="mt-2 bg-[#FFD93D]/10 rounded-lg p-2.5">
                      <p className="text-xs text-[#FFD93D] font-medium">
                        🏆 PRs: {workout.personalRecords.map((pr) => `${pr.exerciseName} ${pr.weight}${unit}`).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">📋</div>
          <p className="font-semibold">No workouts found</p>
          <p className="text-sm text-muted-foreground">
            {history.length === 0
              ? "Complete your first workout to see it here!"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      )}
    </div>
  );
}