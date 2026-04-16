import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X, Plus, Minus, ChevronDown, ChevronUp, Search, Check, ArrowLeft,
  Sparkles, SkipForward, Trophy, Clock, Dumbbell, Save, Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  WorkoutType, WorkoutTypeInfo, WorkoutExercise, ActiveWorkout, CompletedWorkout,
  LoggedSet, Exercise, UserProfile,
  WORKOUT_TYPES, EXERCISE_DATABASE, MUSCLE_GROUPS,
  getExercisesForWorkout, generateId, formatTime, formatDuration,
  getAISuggestion, loadWorkoutHistory, saveActiveWorkout, loadActiveWorkout,
} from "@/lib/gymData";

const CELEBRATION_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbdliaafbq/workout-complete-celebration.png";

interface WorkoutFlowProps {
  profile: UserProfile;
  initialType?: WorkoutType;
  onComplete: (workout: CompletedWorkout) => void;
  onCancel: () => void;
  resumeWorkout?: ActiveWorkout | null;
}

type FlowStep = "select-type" | "exercise-list" | "active" | "rest" | "complete";

// ---------- SET SPINNER ----------
function SetSpinner({
  label, value, onChange, min = 0, step = 1, isBodyweight = false, unit,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; step?: number; isBodyweight?: boolean; unit?: string;
}) {
  if (isBodyweight && label === "Weight") {
    return (
      <div className="flex-1 bg-card border border-white/10 rounded-xl p-3 text-center">
        <p className="text-[11px] text-muted-foreground font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#A29BFE]">BW</p>
      </div>
    );
  }
  return (
    <div className="flex-1 bg-card border border-white/10 rounded-xl p-3">
      <p className="text-[11px] text-muted-foreground font-medium text-center mb-2">{label}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors touch-target"
        >
          <Minus className="w-5 h-5" />
        </button>
        <span className="text-2xl font-bold w-20 text-center tabular-nums">
          {value}{unit ? <span className="text-sm text-muted-foreground ml-1">{unit}</span> : ""}
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors touch-target"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ---------- REST TIMER CIRCLE ----------
function RestTimerCircle({ duration, startedAt, onSkip, nextExercise, lastSet, suggestion, unit }: {
  duration: number; startedAt: number; onSkip: () => void;
  nextExercise: string; lastSet: { weight: number; reps: number } | null;
  suggestion: { weight: number; reps: number } | null; unit: string;
}) {
  const [remaining, setRemaining] = useState(duration);
  const circumference = 2 * Math.PI * 90;

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const r = Math.max(0, duration - elapsed);
      setRemaining(r);
      if (r <= 0) {
        onSkip();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [duration, startedAt, onSkip]);

  const progress = remaining / duration;
  const offset = circumference * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
      <p className="text-muted-foreground text-sm font-medium mb-2">REST</p>
      <p className="text-lg font-semibold mb-8">Next: {nextExercise}</p>

      <div className="relative w-52 h-52 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="100" cy="100" r="90" fill="none"
            stroke="#6C5CE7" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {lastSet && (
        <div className="bg-card border border-white/5 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-xs text-muted-foreground">Last Set</p>
          <p className="font-semibold">
            {lastSet.weight > 0 ? `${lastSet.weight} ${unit} × ` : ""}{lastSet.reps} reps
          </p>
        </div>
      )}

      {suggestion && (
        <div className="flex items-center gap-2 bg-[#6C5CE7]/10 border border-[#6C5CE7]/20 rounded-xl px-4 py-3 mb-8">
          <Sparkles className="w-4 h-4 text-[#A29BFE] shrink-0" />
          <p className="text-sm">
            <span className="text-[#A29BFE] font-medium">Next:</span>{" "}
            Try {suggestion.weight} {unit} × {suggestion.reps} reps
          </p>
        </div>
      )}

      <Button
        onClick={onSkip}
        variant="outline"
        className="h-14 px-8 rounded-xl border-white/10 text-base font-semibold hover:bg-white/5"
      >
        <SkipForward className="w-5 h-5 mr-2" />
        Skip Rest
      </Button>
    </div>
  );
}

// ---------- EXERCISE LIBRARY MODAL ----------
function ExerciseLibrary({ onAdd, onClose, existingIds }: {
  onAdd: (exercise: Exercise) => void; onClose: () => void; existingIds: string[];
}) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);

  const filtered = EXERCISE_DATABASE.filter((e) => {
    if (existingIds.includes(e.id)) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter && e.primaryMuscle !== muscleFilter) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={onClose} className="touch-target flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold flex-1">Exercise Library</h2>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="pl-10 h-11 bg-card border-white/10 rounded-xl"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setMuscleFilter(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !muscleFilter ? "gym-gradient text-white" : "bg-white/5 text-muted-foreground"
            }`}
          >
            All
          </button>
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              onClick={() => setMuscleFilter(m === muscleFilter ? null : m)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                muscleFilter === m ? "gym-gradient text-white" : "bg-white/5 text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 gym-scrollbar">
        {filtered.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => { onAdd(exercise); onClose(); }}
            className="w-full flex items-center gap-3 py-3 border-b border-white/5 text-left active:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
              <Dumbbell className="w-4 h-4 text-[#6C5CE7]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{exercise.name}</p>
              <p className="text-xs text-muted-foreground">
                {exercise.primaryMuscle} · {exercise.equipment}
              </p>
            </div>
            <Plus className="w-5 h-5 text-[#6C5CE7] shrink-0" />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">No exercises found</p>
        )}
      </div>
    </div>
  );
}

// ---------- WORKOUT COMPLETE SCREEN ----------
function WorkoutComplete({ workout, profile, onSave }: {
  workout: CompletedWorkout; profile: UserProfile; onSave: (note: string, mood: number) => void;
}) {
  const [note, setNote] = useState("");
  const [mood, setMood] = useState(0);
  const moods = ["😫", "😐", "🙂", "😊", "🔥"];

  return (
    <div className="min-h-screen bg-background px-4 py-6 safe-bottom animate-fade-in">
      {/* Celebration header */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        <img src={CELEBRATION_IMAGE} alt="" className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-6 h-6 text-[#FFD93D]" />
            <h1 className="text-2xl font-bold">Workout Complete!</h1>
          </div>
          <p className="text-sm text-muted-foreground">{workout.type} Day · {formatDuration(workout.duration)}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-white/5 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{workout.totalSets}</p>
          <p className="text-[11px] text-muted-foreground">Total Sets</p>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{workout.totalVolume.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">{profile.weightUnit} Volume</p>
        </div>
        <div className="bg-card border border-white/5 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{workout.exercises.length}</p>
          <p className="text-[11px] text-muted-foreground">Exercises</p>
        </div>
      </div>

      {/* PRs */}
      {workout.personalRecords.length > 0 && (
        <div className="bg-[#FFD93D]/10 border border-[#FFD93D]/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-[#FFD93D]" />
            <p className="font-semibold text-[#FFD93D]">Personal Records!</p>
          </div>
          {workout.personalRecords.map((pr, i) => (
            <p key={i} className="text-sm text-white/80 ml-7">
              {pr.exerciseName}: {pr.weight} {profile.weightUnit} × {pr.reps}
            </p>
          ))}
        </div>
      )}

      {/* Exercise Breakdown */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Breakdown</h3>
        {workout.exercises.map((ex, i) => (
          <div key={i} className="bg-card border border-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">{ex.exerciseName}</p>
              <p className="text-xs text-muted-foreground">{ex.sets.length} sets</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ex.sets.map((s, j) => (
                <span key={j} className="text-xs bg-white/5 rounded-md px-2 py-1 text-muted-foreground">
                  {s.weight > 0 ? `${s.weight}${profile.weightUnit} × ` : ""}{s.reps}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mood */}
      <div className="space-y-3 mb-6">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">How was it?</p>
        <div className="flex gap-2 justify-center">
          {moods.map((m, i) => (
            <button
              key={i}
              onClick={() => setMood(i + 1)}
              className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all touch-target ${
                mood === i + 1 ? "bg-[#6C5CE7]/20 scale-110 ring-2 ring-[#6C5CE7]" : "bg-white/5"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2 mb-6">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did the workout feel?"
          className="w-full h-20 bg-card border border-white/10 rounded-xl p-3 text-sm resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/50"
        />
      </div>

      <Button
        onClick={() => onSave(note, mood)}
        className="w-full h-14 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90"
      >
        <Save className="w-5 h-5 mr-2" />
        Save Workout
      </Button>
    </div>
  );
}

// ============================================================
// MAIN WORKOUT FLOW
// ============================================================

export default function WorkoutFlow({ profile, initialType, onComplete, onCancel, resumeWorkout }: WorkoutFlowProps) {
  const [step, setStep] = useState<FlowStep>(resumeWorkout ? "active" : initialType ? "exercise-list" : "select-type");
  const [selectedType, setSelectedType] = useState<WorkoutType>(initialType || "Push");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => {
    if (resumeWorkout) return resumeWorkout.exercises;
    if (initialType) return getExercisesForWorkout(initialType);
    return [];
  });
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(resumeWorkout || null);
  const [currentExIdx, setCurrentExIdx] = useState(resumeWorkout?.currentExerciseIndex || 0);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(8);
  const [weightStep, setWeightStep] = useState(2.5);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [setStartedAt, setSetStartedAt] = useState(Date.now());
  const [showLibrary, setShowLibrary] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [completedWorkout, setCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unit = profile.weightUnit;
  const history = loadWorkoutHistory();

  // Workout timer
  useEffect(() => {
    if (activeWorkout && step === "active") {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - activeWorkout.startedAt;
        setElapsedTime(formatTime(elapsed));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [activeWorkout, step]);

  // Persist active workout
  useEffect(() => {
    if (activeWorkout) {
      saveActiveWorkout({ ...activeWorkout, exercises, currentExerciseIndex: currentExIdx });
    }
  }, [activeWorkout, exercises, currentExIdx]);

  // Load AI suggestion for current exercise
  const currentExercise = exercises[currentExIdx];
  const aiSuggestion = currentExercise ? getAISuggestion(currentExercise.exerciseId, history) : null;

  // Initialize weight/reps from AI suggestion or defaults
  useEffect(() => {
    if (currentExercise && step === "active") {
      if (aiSuggestion) {
        setWeight(aiSuggestion.weight);
        setReps(aiSuggestion.reps);
      } else {
        setWeight(currentExercise.exercise.isBodyweight ? 0 : 20);
        setReps(currentExercise.defaultReps);
      }
      setSetStartedAt(Date.now());
    }
  }, [currentExIdx, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectType = (type: WorkoutType) => {
    setSelectedType(type);
    setExercises(getExercisesForWorkout(type));
    setStep("exercise-list");
  };

  const handleStartWorkout = () => {
    const workout: ActiveWorkout = {
      id: generateId(),
      type: selectedType,
      startedAt: Date.now(),
      exercises,
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      restTimerStartedAt: null,
      restTimerDuration: profile.restTimerDuration,
      isResting: false,
    };
    setActiveWorkout(workout);
    setCurrentExIdx(0);
    setStep("active");
  };

  const handleLogSet = () => {
    if (!currentExercise) return;
    const newSet: LoggedSet = {
      id: generateId(),
      weight: currentExercise.exercise.isBodyweight ? 0 : weight,
      reps,
      timestamp: Date.now(),
    };
    const updated = [...exercises];
    updated[currentExIdx] = {
      ...updated[currentExIdx],
      loggedSets: [...updated[currentExIdx].loggedSets, newSet],
    };
    setExercises(updated);

    // Enter rest
    if (activeWorkout) {
      setActiveWorkout({
        ...activeWorkout,
        restTimerStartedAt: Date.now(),
        isResting: true,
      });
    }
    setStep("rest");
  };

  const handleRestComplete = useCallback(() => {
    if (!activeWorkout) return;
    setActiveWorkout({ ...activeWorkout, isResting: false, restTimerStartedAt: null });
    setSetStartedAt(Date.now());
    setStep("active");
  }, [activeWorkout]);

  const handleNextExercise = () => {
    if (currentExIdx < exercises.length - 1) {
      setCurrentExIdx(currentExIdx + 1);
      setSetStartedAt(Date.now());
    }
  };

  const handlePrevExercise = () => {
    if (currentExIdx > 0) {
      setCurrentExIdx(currentExIdx - 1);
      setSetStartedAt(Date.now());
    }
  };

  const handleFinishWorkout = () => {
    if (!activeWorkout) return;
    const prs = getPersonalRecordsFromWorkout(exercises, history, profile.weightUnit);
    const completed: CompletedWorkout = {
      id: activeWorkout.id,
      type: activeWorkout.type,
      date: Date.now(),
      duration: Date.now() - activeWorkout.startedAt,
      exercises: exercises
        .filter((e) => e.loggedSets.length > 0)
        .map((e) => ({
          exerciseId: e.exerciseId,
          exerciseName: e.exercise.name,
          primaryMuscle: e.exercise.primaryMuscle,
          sets: e.loggedSets.map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
      totalSets: exercises.reduce((sum, e) => sum + e.loggedSets.length, 0),
      totalVolume: exercises.reduce(
        (sum, e) => sum + e.loggedSets.reduce((s, set) => s + set.weight * set.reps, 0),
        0
      ),
      personalRecords: prs,
    };
    setCompletedWorkout(completed);
    saveActiveWorkout(null);
    setStep("complete");
  };

  const handleSaveWorkout = (note: string, mood: number) => {
    if (!completedWorkout) return;
    const final = { ...completedWorkout, note, moodRating: mood };
    onComplete(final);
  };

  const handleAddExercise = (exercise: Exercise) => {
    setExercises([
      ...exercises,
      {
        exerciseId: exercise.id,
        exercise,
        defaultSets: 4,
        defaultReps: 8,
        loggedSets: [],
      },
    ]);
  };

  const handleRemoveExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  // ---------- RENDER: TYPE SELECTOR ----------
  if (step === "select-type") {
    return (
      <div className="min-h-screen bg-background px-4 py-4 safe-bottom animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onCancel} className="touch-target flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Choose Workout</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {WORKOUT_TYPES.map((wt: WorkoutTypeInfo) => (
            <button
              key={wt.type}
              onClick={() => handleSelectType(wt.type)}
              className="bg-card border border-white/5 rounded-2xl p-4 text-left active:scale-[0.97] transition-all hover:border-white/10"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                style={{ backgroundColor: wt.color + "20" }}
              >
                {wt.icon}
              </div>
              <p className="font-semibold text-base">{wt.type}</p>
              <p className="text-xs text-muted-foreground mt-1">{wt.estimatedDuration}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {wt.muscleGroups.join(", ")}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- RENDER: EXERCISE LIST ----------
  if (step === "exercise-list") {
    return (
      <div className="min-h-screen bg-background flex flex-col animate-slide-up">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setStep("select-type")} className="touch-target flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{selectedType} Day</h1>
              <p className="text-xs text-muted-foreground">
                {exercises.length} exercises · {WORKOUT_TYPES.find((t) => t.type === selectedType)?.estimatedDuration}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 gym-scrollbar">
          {exercises.map((ex, idx) => {
            const lastPerf = getLastPerformance(ex.exerciseId, history);
            const isExpanded = expandedExercise === ex.exerciseId;
            return (
              <div key={ex.exerciseId + idx} className="border-b border-white/5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-[#6C5CE7]" />
                  </div>
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.exerciseId)}
                  >
                    <p className="font-medium text-sm truncate">{ex.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.exercise.primaryMuscle} · {ex.defaultSets} × {ex.defaultReps}
                    </p>
                  </button>
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.exerciseId)}
                    className="touch-target flex items-center justify-center shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => handleRemoveExercise(idx)}
                    className="touch-target flex items-center justify-center shrink-0"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
                {isExpanded && lastPerf && (
                  <div className="mt-2 ml-[52px] bg-white/5 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground mb-1">Last Session</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lastPerf.map((s, i) => (
                        <span key={i} className="text-xs bg-white/5 rounded px-2 py-0.5">
                          {s.weight > 0 ? `${s.weight}${unit} × ` : ""}{s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {isExpanded && !lastPerf && (
                  <div className="mt-2 ml-[52px]">
                    <p className="text-xs text-muted-foreground">No previous data</p>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setShowLibrary(true)}
            className="w-full flex items-center justify-center gap-2 py-4 text-[#6C5CE7] font-medium text-sm active:opacity-70"
          >
            <Plus className="w-4 h-4" />
            Add Exercise
          </button>
        </div>

        {/* Sticky start button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 glass-effect border-t border-white/5">
          <Button
            onClick={handleStartWorkout}
            disabled={exercises.length === 0}
            className="w-full h-14 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            Start Workout
          </Button>
        </div>

        {showLibrary && (
          <ExerciseLibrary
            onAdd={handleAddExercise}
            onClose={() => setShowLibrary(false)}
            existingIds={exercises.map((e) => e.exerciseId)}
          />
        )}
      </div>
    );
  }

  // ---------- RENDER: REST TIMER ----------
  if (step === "rest" && activeWorkout?.restTimerStartedAt) {
    const nextEx = exercises[currentExIdx];
    const lastLoggedSet = nextEx?.loggedSets[nextEx.loggedSets.length - 1];
    const nextSuggestion = aiSuggestion;

    return (
      <RestTimerCircle
        duration={profile.restTimerDuration}
        startedAt={activeWorkout.restTimerStartedAt}
        onSkip={handleRestComplete}
        nextExercise={nextEx?.exercise.name || "Next Exercise"}
        lastSet={lastLoggedSet ? { weight: lastLoggedSet.weight, reps: lastLoggedSet.reps } : null}
        suggestion={nextSuggestion}
        unit={unit}
      />
    );
  }

  // ---------- RENDER: COMPLETE ----------
  if (step === "complete" && completedWorkout) {
    return (
      <WorkoutComplete
        workout={completedWorkout}
        profile={profile}
        onSave={handleSaveWorkout}
      />
    );
  }

  // ---------- RENDER: ACTIVE WORKOUT ----------
  if (!currentExercise) return null;

  const setsLogged = currentExercise.loggedSets.length;
  const totalSetsTarget = currentExercise.defaultSets;
  const setTimerElapsed = formatTime(Date.now() - setStartedAt);

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{activeWorkout?.type}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">{elapsedTime}</span>
        </div>
        <button
          onClick={handleFinishWorkout}
          className="touch-target flex items-center justify-center text-red-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Exercise navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={handlePrevExercise}
          disabled={currentExIdx === 0}
          className="touch-target flex items-center justify-center text-muted-foreground disabled:opacity-30"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-xs text-muted-foreground">
          Exercise {currentExIdx + 1} of {exercises.length}
        </p>
        <button
          onClick={handleNextExercise}
          disabled={currentExIdx === exercises.length - 1}
          className="touch-target flex items-center justify-center text-muted-foreground disabled:opacity-30 rotate-180"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Current exercise card */}
      <div className="flex-1 px-4 space-y-4">
        <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-5">
          <div>
            <h2 className="text-xl font-bold">{currentExercise.exercise.name}</h2>
            <p className="text-sm text-muted-foreground">{currentExercise.exercise.primaryMuscle}</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Set <span className="text-[#6C5CE7]">{setsLogged + 1}</span> of {totalSetsTarget}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums">{setTimerElapsed}</span>
            </div>
          </div>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="flex items-center gap-2 bg-[#6C5CE7]/10 border border-[#6C5CE7]/20 rounded-xl px-3 py-2.5">
              <Sparkles className="w-4 h-4 text-[#A29BFE] shrink-0" />
              <p className="text-sm">
                <span className="text-[#A29BFE] font-medium">💡</span>{" "}
                Try {aiSuggestion.weight}{unit} × {aiSuggestion.reps} reps — up from last session
              </p>
            </div>
          )}

          {/* Spinners */}
          <div className="flex gap-3">
            <SetSpinner
              label="Weight"
              value={weight}
              onChange={setWeight}
              step={weightStep}
              isBodyweight={currentExercise.exercise.isBodyweight}
              unit={unit}
            />
            <SetSpinner
              label="Reps"
              value={reps}
              onChange={setReps}
              min={1}
              step={1}
            />
          </div>

          {/* Weight increment toggle */}
          {!currentExercise.exercise.isBodyweight && (
            <div className="flex items-center justify-center gap-2">
              {[1.25, 2.5, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setWeightStep(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    weightStep === s
                      ? "bg-[#6C5CE7] text-white"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  ±{s}{unit}
                </button>
              ))}
            </div>
          )}

          {/* Log Set Button */}
          <Button
            onClick={handleLogSet}
            className="w-full h-14 gym-gradient text-white font-bold text-lg rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Check className="w-6 h-6 mr-2" />
            Log Set
          </Button>
        </div>

        {/* Completed sets strip */}
        {setsLogged > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Completed Sets</p>
            <div className="flex flex-wrap gap-2">
              {currentExercise.loggedSets.map((s, i) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 bg-[#00E676]/10 text-[#00E676] text-xs font-medium rounded-full px-3 py-1.5"
                >
                  <Check className="w-3 h-3" />
                  {s.weight > 0 ? `${s.weight}${unit} × ` : ""}{s.reps}
                  <span className="text-[#00E676]/50 ml-0.5">#{i + 1}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming exercises */}
        {exercises.length > currentExIdx + 1 && (
          <div className="pb-6">
            <button
              onClick={() => setShowUpcoming(!showUpcoming)}
              className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2"
            >
              Upcoming ({exercises.length - currentExIdx - 1})
              {showUpcoming ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showUpcoming && (
              <div className="space-y-1.5 animate-slide-up">
                {exercises.slice(currentExIdx + 1).map((ex, i) => (
                  <button
                    key={ex.exerciseId + i}
                    onClick={() => { setCurrentExIdx(currentExIdx + 1 + i); setSetStartedAt(Date.now()); }}
                    className="w-full flex items-center gap-3 bg-white/[0.02] rounded-lg p-2.5 text-left active:bg-white/5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs text-muted-foreground font-medium">
                      {currentExIdx + 2 + i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.exercise.name}</p>
                      <p className="text-xs text-muted-foreground">{ex.exercise.primaryMuscle}</p>
                    </div>
                    {ex.loggedSets.length > 0 && (
                      <Check className="w-4 h-4 text-[#00E676] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Finish workout button at bottom */}
        <div className="pb-6">
          <Button
            onClick={handleFinishWorkout}
            variant="outline"
            className="w-full h-12 border-white/10 text-sm font-medium rounded-xl hover:bg-white/5"
          >
            Finish Workout
          </Button>
        </div>
      </div>

      {showLibrary && (
        <ExerciseLibrary
          onAdd={handleAddExercise}
          onClose={() => setShowLibrary(false)}
          existingIds={exercises.map((e) => e.exerciseId)}
        />
      )}
    </div>
  );
}

// ---------- HELPERS ----------

function getLastPerformance(exerciseId: string, history: CompletedWorkout[]): { weight: number; reps: number }[] | null {
  for (const workout of history) {
    const ex = workout.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex) return ex.sets;
  }
  return null;
}

function getPersonalRecordsFromWorkout(
  exercises: WorkoutExercise[],
  history: CompletedWorkout[],
  _unit: string
): { exerciseName: string; weight: number; reps: number }[] {
  const prs: { exerciseName: string; weight: number; reps: number }[] = [];

  for (const ex of exercises) {
    if (ex.loggedSets.length === 0) continue;
    const maxWeight = Math.max(...ex.loggedSets.map((s) => s.weight));
    if (maxWeight === 0) continue;

    let previousMax = 0;
    for (const w of history) {
      const prev = w.exercises.find((e) => e.exerciseId === ex.exerciseId);
      if (prev) {
        const prevMax = Math.max(...prev.sets.map((s) => s.weight));
        previousMax = Math.max(previousMax, prevMax);
      }
    }

    if (maxWeight > previousMax) {
      const bestSet = ex.loggedSets.reduce((best, s) => (s.weight > best.weight ? s : best), ex.loggedSets[0]);
      prs.push({ exerciseName: ex.exercise.name, weight: bestSet.weight, reps: bestSet.reps });
    }
  }
  return prs;
}