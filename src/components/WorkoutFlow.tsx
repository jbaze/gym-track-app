import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X, Plus, Minus, ChevronDown, ChevronUp, Search, Check, ArrowLeft,
  Sparkles, SkipForward, Trophy, Clock, Dumbbell, Save, Star,
  GripVertical, Pause, Play, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  WorkoutType, WorkoutTypeInfo, WorkoutExercise, ActiveWorkout, CompletedWorkout,
  LoggedSet, Exercise, UserProfile, WorkoutPlan,
  WORKOUT_TYPES, EXERCISE_DATABASE, MUSCLE_GROUPS,
  getExercisesForWorkout, generateId, formatTime, formatDuration,
  getAISuggestion, loadWorkoutHistory, saveActiveWorkout, loadActiveWorkout,
  saveWorkoutPlans, loadWorkoutPlans, getAllExercises,
  saveDraftPlan, loadDraftPlan, clearDraftPlan, DraftPlan,
} from "@/lib/gymData";

const CELEBRATION_IMAGE = "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbdliaafbq/workout-complete-celebration.png";

const PLAN_ICONS = ["🏋️", "🔥", "⚡", "💪", "🎯", "🦾"];
const PLAN_COLORS = ["#6C5CE7", "#00E676", "#FFD93D", "#FF6B6B", "#A29BFE", "#00B894"];

interface WorkoutFlowProps {
  profile: UserProfile;
  initialType?: WorkoutType;
  onComplete: (workout: CompletedWorkout) => void;
  onCancel: () => void;
  resumeWorkout?: ActiveWorkout | null;
}

type FlowStep = "select-type" | "exercise-list" | "active" | "rest" | "inter-exercise-rest" | "complete";

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

// ---------- AUDIO BEEP ----------
function playBeep(ctx: AudioContext, freq: number, dur: number, vol = 0.4) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

// ---------- REST TIMER CIRCLE ----------
function RestTimerCircle({ duration, startedAt, onSkip, nextExercise, lastSet, suggestion, unit, isPaused }: {
  duration: number; startedAt: number; onSkip: () => void;
  nextExercise: string; lastSet: { weight: number; reps: number } | null;
  suggestion: { weight: number; reps: number } | null; unit: string;
  isPaused?: boolean;
}) {
  const [remaining, setRemaining] = useState(duration);
  const circumference = 2 * Math.PI * 90;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepedRef = useRef<number>(-1);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return;
      const elapsed = (Date.now() - startedAt) / 1000;
      const r = Math.max(0, duration - elapsed);
      setRemaining(r);

      // Countdown beeps at 5, 4, 3, 2, 1, 0
      const countdownSec = Math.ceil(r);
      if (r <= 5 && countdownSec !== lastBeepedRef.current) {
        lastBeepedRef.current = countdownSec;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (countdownSec === 0) {
          // Done — two rising beeps
          playBeep(ctx, 880, 0.15);
          setTimeout(() => playBeep(ctx, 1100, 0.25), 180);
        } else {
          // Tick — short single beep, gets slightly higher as it nears zero
          playBeep(ctx, 660 + (5 - countdownSec) * 30, 0.08);
        }
      }

      if (r <= 0) onSkip();
    }, 100);
    return () => clearInterval(interval);
  }, [duration, startedAt, onSkip, isPaused]);

  const progress = remaining / duration;
  const offset = circumference * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const isCountdown = remaining <= 5 && remaining > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
      <p className="text-muted-foreground text-sm font-medium mb-2">REST</p>
      <p className="text-lg font-semibold mb-8">Next: {nextExercise}</p>

      <div className="relative w-52 h-52 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="100" cy="100" r="90" fill="none"
            stroke={isPaused ? "#8B8BA3" : isCountdown ? "#00E676" : "#6C5CE7"} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isPaused ? (
            <span className="text-3xl font-bold text-[#8B8BA3]">PAUSED</span>
          ) : (
            <>
              <span className={`text-5xl font-bold tabular-nums transition-colors ${isCountdown ? "text-[#00E676]" : ""}`}>
                {mins}:{secs.toString().padStart(2, "0")}
              </span>
              {isCountdown && (
                <span className="text-xs text-[#00E676] font-semibold mt-1 animate-pulse">GET READY</span>
              )}
            </>
          )}
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
function ExerciseLibrary({ onAdd, onClose, existingIds, replaceMode = false }: {
  onAdd: (exercise: Exercise) => void; onClose: () => void; existingIds: string[];
  replaceMode?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);

  const filtered = getAllExercises().filter((e) => {
    if (!replaceMode && existingIds.includes(e.id)) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter && e.primaryMuscle !== muscleFilter) return false;
    return true;
  });

  // ---------- EXERCISE DETAIL VIEW ----------
  if (detail) {
    const alreadyAdded = !replaceMode && existingIds.includes(detail.id);
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <button onClick={() => setDetail(null)} className="touch-target flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold flex-1 truncate">{detail.name}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 gym-scrollbar space-y-4">
          {/* Animated exercise illustration */}
          <div className="bg-card border border-white/5 rounded-2xl overflow-hidden h-44 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Animated SVG stick-figure representing the exercise */}
              <svg viewBox="0 0 120 120" className="w-28 h-28" style={{ filter: "drop-shadow(0 0 12px rgba(108,92,231,0.3))" }}>
                {/* Body glow */}
                <circle cx="60" cy="22" r="12" fill="#6C5CE7" opacity="0.15" className="animate-pulse" />
                {/* Head */}
                <circle cx="60" cy="22" r="8" fill="none" stroke="#6C5CE7" strokeWidth="2.5" />
                {/* Torso */}
                <line x1="60" y1="30" x2="60" y2="60" stroke="#6C5CE7" strokeWidth="2.5" strokeLinecap="round" />
                {/* Arms — animate based on equipment */}
                {detail.isBodyweight ? (
                  <>
                    <line x1="60" y1="40" x2="35" y2="55" stroke="#A29BFE" strokeWidth="2" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0 60 40;-15 60 40;0 60 40" dur="1.2s" repeatCount="indefinite" />
                    </line>
                    <line x1="60" y1="40" x2="85" y2="55" stroke="#A29BFE" strokeWidth="2" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0 60 40;15 60 40;0 60 40" dur="1.2s" repeatCount="indefinite" />
                    </line>
                  </>
                ) : (
                  <>
                    <line x1="60" y1="38" x2="30" y2="45" stroke="#A29BFE" strokeWidth="2" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0 60 38;20 60 38;0 60 38" dur="1.4s" repeatCount="indefinite" />
                    </line>
                    <line x1="60" y1="38" x2="90" y2="45" stroke="#A29BFE" strokeWidth="2" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0 60 38;-20 60 38;0 60 38" dur="1.4s" repeatCount="indefinite" />
                    </line>
                    {/* Barbell / weight */}
                    <rect x="18" y="42" width="12" height="5" rx="2" fill="#FFD93D" opacity="0.8" />
                    <rect x="90" y="42" width="12" height="5" rx="2" fill="#FFD93D" opacity="0.8" />
                    <line x1="30" y1="44" x2="90" y2="44" stroke="#FFD93D" strokeWidth="2" opacity="0.8" />
                  </>
                )}
                {/* Legs */}
                <line x1="60" y1="60" x2="44" y2="88" stroke="#6C5CE7" strokeWidth="2.5" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 60 60;8 60 60;0 60 60" dur="1.2s" repeatCount="indefinite" />
                </line>
                <line x1="60" y1="60" x2="76" y2="88" stroke="#6C5CE7" strokeWidth="2.5" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 60 60;-8 60 60;0 60 60" dur="1.2s" repeatCount="indefinite" />
                </line>
                {/* Feet */}
                <line x1="44" y1="88" x2="36" y2="92" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" />
                <line x1="76" y1="88" x2="84" y2="92" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="absolute bottom-3 left-3">
              <span className="text-[10px] bg-[#6C5CE7]/20 text-[#A29BFE] px-2 py-1 rounded-full font-medium">
                {detail.equipment}
              </span>
            </div>
            {detail.isBodyweight && (
              <div className="absolute bottom-3 right-3">
                <span className="text-[10px] bg-[#00E676]/20 text-[#00E676] px-2 py-1 rounded-full font-medium">
                  Bodyweight
                </span>
              </div>
            )}
          </div>

          {/* Muscles */}
          <div className="bg-card border border-white/5 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Muscles</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-[#6C5CE7]/15 text-[#A29BFE] px-2.5 py-1 rounded-full font-medium">
                {detail.primaryMuscle} (primary)
              </span>
              {detail.secondaryMuscles.map((m) => (
                <span key={m} className="text-xs bg-white/5 text-muted-foreground px-2.5 py-1 rounded-full">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-white/5 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How to Perform</p>
            <p className="text-sm text-white/80 leading-relaxed">{detail.description}</p>
          </div>
        </div>

        {/* Add / Replace button */}
        <div className="p-4 border-t border-white/5">
          {alreadyAdded ? (
            <p className="text-center text-sm text-muted-foreground py-2">Already in your workout</p>
          ) : (
            <Button
              onClick={() => { onAdd(detail); onClose(); }}
              className="w-full h-14 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90"
            >
              {replaceMode ? <><RefreshCw className="w-5 h-5 mr-2" />Replace with this</> : <><Plus className="w-5 h-5 mr-2" />Add to Workout</>}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={onClose} className="touch-target flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold flex-1">
          {replaceMode ? "Replace Exercise" : "Exercise Library"}
        </h2>
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
            onClick={() => setDetail(exercise)}
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
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 -rotate-90" />
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
    if (initialType && initialType !== "Custom") return getExercisesForWorkout(initialType);
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
  const [showReplaceFor, setShowReplaceFor] = useState<number | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [completedWorkout, setCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [timedRemaining, setTimedRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoLoggedRef = useRef(false);

  // Pause / Resume
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedMs, setTotalPausedMs] = useState(resumeWorkout?.totalPausedMs ?? 0);
  const pausedAtRef = useRef<number | null>(null);

  // Inter-exercise rest
  const [interExRestDuration, setInterExRestDuration] = useState(0);
  const [interExRestStartedAt, setInterExRestStartedAt] = useState(0);
  const [interExNextIdx, setInterExNextIdx] = useState(0);

  // Drag-and-drop reorder
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null);
  const exerciseListRef = useRef<HTMLDivElement>(null);

  // Delete confirmation
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  // Custom plans
  const [plans, setPlans] = useState<WorkoutPlan[]>(() => loadWorkoutPlans());
  const [createPlanMode, setCreatePlanMode] = useState(false);
  // Create plan wizard
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planIcon, setPlanIcon] = useState(PLAN_ICONS[0]);
  const [planColor, setPlanColor] = useState(PLAN_COLORS[0]);

  // Draft plan — auto-saved to localStorage so page refresh doesn't lose progress
  const [hasDraft, setHasDraft] = useState(() => !!loadDraftPlan());

  const unit = profile.weightUnit;
  const history = loadWorkoutHistory();

  // Workout timer — pauses when isPaused
  useEffect(() => {
    if (activeWorkout && step === "active") {
      timerRef.current = setInterval(() => {
        if (isPaused) return;
        const elapsed = Date.now() - activeWorkout.startedAt - totalPausedMs;
        setElapsedTime(formatTime(elapsed));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [activeWorkout, step, isPaused, totalPausedMs]);

  // Timed set countdown + auto-log — pauses when isPaused
  useEffect(() => {
    const setDuration = exercises[currentExIdx]?.setDurationSeconds ?? 0;
    if (setDuration <= 0 || step !== "active") return;
    autoLoggedRef.current = false;
    setTimedRemaining(setDuration);
    const iv = setInterval(() => {
      if (isPaused) return;
      const remaining = Math.max(0, setDuration - (Date.now() - setStartedAt) / 1000);
      setTimedRemaining(remaining);
      if (remaining <= 0 && !autoLoggedRef.current) {
        autoLoggedRef.current = true;
        clearInterval(iv);
        handleLogSet();
      }
    }, 100);
    return () => clearInterval(iv);
  }, [currentExIdx, setStartedAt, step, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist active workout
  useEffect(() => {
    if (activeWorkout) {
      saveActiveWorkout({ ...activeWorkout, exercises, currentExerciseIndex: currentExIdx, totalPausedMs });
    }
  }, [activeWorkout, exercises, currentExIdx, totalPausedMs]);

  // Auto-save draft plan while creating
  useEffect(() => {
    if (createPlanMode && step === "exercise-list") {
      saveDraftPlan({ planName, planIcon, planColor, exercises });
    }
  }, [createPlanMode, step, planName, planIcon, planColor, exercises]);

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

  // ---------- PAUSE / RESUME ----------
  const handlePause = () => {
    pausedAtRef.current = Date.now();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (pausedAtRef.current !== null) {
      setTotalPausedMs((prev) => prev + (Date.now() - pausedAtRef.current!));
      pausedAtRef.current = null;
    }
    setIsPaused(false);
  };

  // ---------- SELECT TYPE ----------
  const handleSelectType = (type: WorkoutType) => {
    setSelectedType(type);
    setExercises(getExercisesForWorkout(type));
    setCreatePlanMode(false);
    setStep("exercise-list");
  };

  const handleStartFromPlan = (plan: WorkoutPlan) => {
    const resolved: WorkoutExercise[] = plan.exercises
      .map((pe) => {
        const ex = EXERCISE_DATABASE.find((e) => e.id === pe.exerciseId);
        if (!ex) return null;
        return {
          exerciseId: pe.exerciseId,
          exercise: ex,
          defaultSets: pe.defaultSets,
          defaultReps: pe.defaultReps,
          restSeconds: pe.restSeconds,
          interExerciseRestSeconds: pe.interExerciseRestSeconds,
          setDurationSeconds: pe.setDurationSeconds,
          loggedSets: [],
        };
      })
      .filter(Boolean) as WorkoutExercise[];
    setSelectedType("Custom");
    setExercises(resolved);
    setCreatePlanMode(false);
    setStep("exercise-list");
  };

  const handleResumeDraft = () => {
    const draft = loadDraftPlan();
    if (!draft) return;
    setPlanName(draft.planName);
    setPlanIcon(draft.planIcon);
    setPlanColor(draft.planColor);
    setExercises(draft.exercises);
    setSelectedType("Custom");
    setCreatePlanMode(true);
    setHasDraft(false);
    setStep("exercise-list");
  };

  const handleDiscardDraft = () => {
    clearDraftPlan();
    setHasDraft(false);
  };

  const handleDeletePlan = (planId: string) => {
    const updated = plans.filter((p) => p.id !== planId);
    saveWorkoutPlans(updated);
    setPlans(updated);
  };

  // ---------- CREATE PLAN ----------
  const handleOpenCreatePlan = () => {
    setPlanName("");
    setPlanIcon(PLAN_ICONS[0]);
    setPlanColor(PLAN_COLORS[0]);
    setShowCreatePlan(true);
  };

  const handleCreatePlanNext = () => {
    if (!planName.trim()) return;
    setShowCreatePlan(false);
    setSelectedType("Custom");
    setExercises([]);
    setCreatePlanMode(true);
    setStep("exercise-list");
  };

  const handleSavePlan = () => {
    const newPlan: WorkoutPlan = {
      id: generateId(),
      name: planName,
      icon: planIcon,
      color: planColor,
      exercises: exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        restSeconds: ex.restSeconds,
        interExerciseRestSeconds: ex.interExerciseRestSeconds,
        setDurationSeconds: ex.setDurationSeconds,
      })),
      createdAt: Date.now(),
    };
    const updated = [...plans, newPlan];
    saveWorkoutPlans(updated);
    setPlans(updated);
    clearDraftPlan();
    setHasDraft(false);
    setCreatePlanMode(false);
    setStep("select-type");
  };

  // ---------- START WORKOUT ----------
  const handleStartWorkout = () => {
    const workout: ActiveWorkout = {
      id: generateId(),
      type: selectedType,
      startedAt: Date.now(),
      totalPausedMs: 0,
      exercises,
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      restTimerStartedAt: null,
      restTimerDuration: profile.restTimerDuration,
      isResting: false,
    };
    setActiveWorkout(workout);
    setCurrentExIdx(0);
    setTotalPausedMs(0);
    setIsPaused(false);
    setStep("active");
  };

  // ---------- LOG SET ----------
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

  // ---------- REST COMPLETE ----------
  const handleRestComplete = useCallback(() => {
    if (!activeWorkout) return;
    setActiveWorkout({ ...activeWorkout, isResting: false, restTimerStartedAt: null });

    // Check if all target sets are done for current exercise
    const ex = exercises[currentExIdx];
    if (ex && ex.loggedSets.length >= ex.defaultSets) {
      // All sets done — advance to next exercise
      if (currentExIdx < exercises.length - 1) {
        const interRest = ex.interExerciseRestSeconds ?? 0;
        if (interRest > 0) {
          // Show inter-exercise rest screen
          setInterExRestDuration(interRest);
          setInterExRestStartedAt(Date.now());
          setInterExNextIdx(currentExIdx + 1);
          setStep("inter-exercise-rest");
        } else {
          setCurrentExIdx(currentExIdx + 1);
          setSetStartedAt(Date.now());
          setStep("active");
        }
      } else {
        // Last exercise done — go to finish
        handleFinishWorkout();
      }
    } else {
      setSetStartedAt(Date.now());
      setStep("active");
    }
  }, [activeWorkout, exercises, currentExIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- INTER-EXERCISE REST COMPLETE ----------
  const handleInterExRestComplete = useCallback(() => {
    setCurrentExIdx(interExNextIdx);
    setSetStartedAt(Date.now());
    setStep("active");
  }, [interExNextIdx]);

  // ---------- NEXT / PREV EXERCISE ----------
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

  // ---------- FINISH WORKOUT ----------
  const handleFinishWorkout = () => {
    if (!activeWorkout) return;
    const prs = getPersonalRecordsFromWorkout(exercises, history, profile.weightUnit);
    const completed: CompletedWorkout = {
      id: activeWorkout.id,
      type: activeWorkout.type,
      date: Date.now(),
      duration: Date.now() - activeWorkout.startedAt - totalPausedMs,
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

  // ---------- EXERCISE LIST HELPERS ----------
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

  const handleUpdateExercise = (idx: number, update: Partial<WorkoutExercise>) => {
    setExercises(exercises.map((ex, i) => (i === idx ? { ...ex, ...update } : ex)));
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...exercises];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setExercises(updated);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === exercises.length - 1) return;
    const updated = [...exercises];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setExercises(updated);
  };

  // ---------- DRAG-AND-DROP ----------
  const handleDragStart = (idx: number, e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragSrcIdx(idx);
    setDragTargetIdx(idx);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (dragSrcIdx === null || !exerciseListRef.current) return;
    const items = exerciseListRef.current.querySelectorAll("[data-ex-item]");
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setDragTargetIdx(i);
        break;
      }
    }
  };

  const handleDragEnd = () => {
    if (dragSrcIdx !== null && dragTargetIdx !== null && dragSrcIdx !== dragTargetIdx) {
      const updated = [...exercises];
      const [moved] = updated.splice(dragSrcIdx, 1);
      updated.splice(dragTargetIdx, 0, moved);
      setExercises(updated);
    }
    setDragSrcIdx(null);
    setDragTargetIdx(null);
  };

  // ---------- REPLACE EXERCISE ----------
  const handleReplaceExercise = (exercise: Exercise) => {
    if (showReplaceFor === null) return;
    setExercises(exercises.map((ex, i) =>
      i === showReplaceFor
        ? { ...ex, exerciseId: exercise.id, exercise }
        : ex
    ));
    setShowReplaceFor(null);
  };

  // ============================================================
  // RENDER: CREATE PLAN WIZARD (modal overlay)
  // ============================================================
  if (showCreatePlan) {
    return (
      <div className="min-h-screen bg-background px-4 py-4 safe-bottom animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowCreatePlan(false)} className="touch-target flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Create Plan</h1>
        </div>

        <div className="space-y-6">
          {/* Plan name */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Plan Name</p>
            <Input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. My Push Day"
              className="h-12 bg-card border-white/10 rounded-xl text-base"
            />
          </div>

          {/* Icon picker */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Icon</p>
            <div className="flex gap-3">
              {PLAN_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setPlanIcon(icon)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                    planIcon === icon
                      ? "ring-2 ring-[#6C5CE7] bg-[#6C5CE7]/20 scale-110"
                      : "bg-white/5"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Color</p>
            <div className="flex gap-3">
              {PLAN_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setPlanColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    planColor === color ? "scale-125 ring-2 ring-white/50" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Button
            onClick={handleCreatePlanNext}
            disabled={!planName.trim()}
            className="w-full h-14 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            Next: Add Exercises
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: TYPE SELECTOR
  // ============================================================
  if (step === "select-type") {
    return (
      <div className="min-h-screen bg-background px-4 py-4 safe-bottom animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onCancel} className="touch-target flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Choose Workout</h1>
        </div>

        {/* Resume draft banner */}
        {hasDraft && (() => {
          const draft = loadDraftPlan();
          return draft ? (
            <div className="mb-4 bg-[#FFD93D]/10 border border-[#FFD93D]/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{draft.planIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#FFD93D]">Resume creating plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "{draft.planName}" · {draft.exercises.length} exercise{draft.exercises.length !== 1 ? "s" : ""} added
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleResumeDraft}
                  className="flex-1 h-9 bg-[#FFD93D] text-black font-semibold text-sm rounded-xl hover:opacity-90"
                >
                  Resume
                </Button>
                <Button
                  onClick={handleDiscardDraft}
                  variant="outline"
                  className="flex-1 h-9 border-white/10 text-muted-foreground text-sm rounded-xl hover:bg-white/5"
                >
                  Discard
                </Button>
              </div>
            </div>
          ) : null;
        })()}

        {/* My Plans section */}
        {(plans.length > 0 || true) && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Plans</p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {plans.map((plan) => (
                <div key={plan.id} className="relative shrink-0 w-36">
                  <button
                    onClick={() => handleStartFromPlan(plan)}
                    className="w-full bg-card border border-white/5 rounded-2xl p-4 text-left active:scale-[0.97] transition-all hover:border-white/10"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl mb-3"
                      style={{ backgroundColor: plan.color + "20" }}
                    >
                      {plan.icon}
                    </div>
                    <p className="font-semibold text-sm truncate">{plan.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.exercises.length} exercises</p>
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center active:bg-red-500/40"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}

              {/* Create Plan card */}
              <button
                onClick={handleOpenCreatePlan}
                className="shrink-0 w-36 bg-card border border-dashed border-white/10 rounded-2xl p-4 text-left active:scale-[0.97] transition-all hover:border-white/20 flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#6C5CE7]" />
                </div>
                <p className="font-medium text-sm text-[#6C5CE7]">Create Plan</p>
              </button>
            </div>
          </div>
        )}

        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Workout Types</p>
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

  // ============================================================
  // RENDER: EXERCISE LIST
  // ============================================================
  if (step === "exercise-list") {
    return (
      <div className="min-h-screen bg-background flex flex-col animate-slide-up">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => {
                setCreatePlanMode(false);
                setStep("select-type");
              }}
              className="touch-target flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {createPlanMode ? (planName || "New Plan") : `${selectedType} Day`}
              </h1>
              <p className="text-xs text-muted-foreground">
                {exercises.length} exercises
                {!createPlanMode && ` · ${WORKOUT_TYPES.find((t) => t.type === selectedType)?.estimatedDuration}`}
              </p>
            </div>
          </div>
        </div>

        <div
          ref={exerciseListRef}
          className="flex-1 overflow-y-auto px-4 pb-24 gym-scrollbar"
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
          {exercises.map((ex, idx) => {
            const lastPerf = getLastPerformance(ex.exerciseId, history);
            const isExpanded = expandedExercise === ex.exerciseId;
            const isDragging = dragSrcIdx === idx;
            const isDragTarget = dragTargetIdx === idx && dragSrcIdx !== null && dragSrcIdx !== idx;
            return (
              <div
                key={ex.exerciseId + idx}
                data-ex-item
                className={`border-b border-white/5 py-3 transition-all ${isDragging ? "opacity-40" : ""} ${isDragTarget ? "border-t-2 border-t-[#6C5CE7]" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {/* Drag handle */}
                  <div
                    onPointerDown={(e) => handleDragStart(idx, e)}
                    className="touch-none cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-[#6C5CE7]" />
                  </div>
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => {
                      setConfirmDeleteIdx(null);
                      setExpandedExercise(isExpanded ? null : ex.exerciseId);
                    }}
                  >
                    <p className="font-medium text-sm truncate">{ex.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.exercise.primaryMuscle} · {ex.defaultSets} × {ex.defaultReps}
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDeleteIdx(null);
                      setExpandedExercise(isExpanded ? null : ex.exerciseId);
                    }}
                    className="touch-target flex items-center justify-center shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteIdx(confirmDeleteIdx === idx ? null : idx)}
                    className="touch-target flex items-center justify-center shrink-0"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>

                {/* Delete confirmation bar */}
                {confirmDeleteIdx === idx && (
                  <div className="flex items-center gap-3 mt-2 ml-8 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <p className="flex-1 text-xs text-red-400">Remove {ex.exercise.name}?</p>
                    <button
                      onClick={() => { handleRemoveExercise(idx); setConfirmDeleteIdx(null); }}
                      className="text-xs font-semibold text-red-400 px-2 py-1 active:opacity-70"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmDeleteIdx(null)}
                      className="text-xs text-muted-foreground px-2 py-1 active:opacity-70"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-3 ml-8 space-y-3">
                    {/* Last performance */}
                    {lastPerf ? (
                      <div className="bg-white/5 rounded-lg p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Last Session</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lastPerf.map((s, i) => (
                            <span key={i} className="text-xs bg-white/5 rounded px-2 py-0.5">
                              {s.weight > 0 ? `${s.weight}${unit} × ` : ""}{s.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No previous data</p>
                    )}

                    {/* Timing settings — 3 controls */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Rest time */}
                      <div className="bg-card border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-muted-foreground mb-2">Rest</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateExercise(idx, { restSeconds: Math.max(15, (ex.restSeconds ?? profile.restTimerDuration) - 15) })}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm active:bg-white/20"
                          >−</button>
                          <span className="text-xs font-bold tabular-nums w-10 text-center">
                            {ex.restSeconds ?? profile.restTimerDuration}s
                          </span>
                          <button
                            onClick={() => handleUpdateExercise(idx, { restSeconds: Math.min(300, (ex.restSeconds ?? profile.restTimerDuration) + 15) })}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm active:bg-white/20"
                          >+</button>
                        </div>
                      </div>

                      {/* Set timer */}
                      <div className="bg-card border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-muted-foreground mb-2">Set Timer</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateExercise(idx, { setDurationSeconds: Math.max(0, (ex.setDurationSeconds ?? 0) - 5) })}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm active:bg-white/20"
                          >−</button>
                          <span className={`text-xs font-bold tabular-nums w-10 text-center ${(ex.setDurationSeconds ?? 0) > 0 ? "text-[#6C5CE7]" : ""}`}>
                            {(ex.setDurationSeconds ?? 0) === 0 ? "OFF" : `${ex.setDurationSeconds}s`}
                          </span>
                          <button
                            onClick={() => handleUpdateExercise(idx, { setDurationSeconds: Math.min(300, (ex.setDurationSeconds ?? 0) + 5) })}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm active:bg-white/20"
                          >+</button>
                        </div>
                      </div>

                      {/* After Exercise (inter-exercise rest) */}
                      <div className="bg-card border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-muted-foreground mb-2">After Ex.</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateExercise(idx, { interExerciseRestSeconds: Math.max(0, (ex.interExerciseRestSeconds ?? 0) - 15) })}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm active:bg-white/20"
                          >−</button>
                          <span className={`text-xs font-bold tabular-nums w-10 text-center ${(ex.interExerciseRestSeconds ?? 0) > 0 ? "text-[#FFD93D]" : ""}`}>
                            {(ex.interExerciseRestSeconds ?? 0) === 0 ? "OFF" : `${ex.interExerciseRestSeconds}s`}
                          </span>
                          <button
                            onClick={() => handleUpdateExercise(idx, { interExerciseRestSeconds: Math.min(300, (ex.interExerciseRestSeconds ?? 0) + 15) })}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm active:bg-white/20"
                          >+</button>
                        </div>
                      </div>
                    </div>

                    {/* Replace button */}
                    <button
                      onClick={() => setShowReplaceFor(idx)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 rounded-lg px-3 py-2 active:bg-white/10 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replace Exercise
                    </button>
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

        {/* Sticky footer button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 glass-effect border-t border-white/5">
          {createPlanMode ? (
            <Button
              onClick={handleSavePlan}
              disabled={exercises.length === 0}
              className="w-full h-14 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              Save as Plan
            </Button>
          ) : (
            <Button
              onClick={handleStartWorkout}
              disabled={exercises.length === 0}
              className="w-full h-14 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              Start Workout
            </Button>
          )}
        </div>

        {showLibrary && (
          <ExerciseLibrary
            onAdd={handleAddExercise}
            onClose={() => setShowLibrary(false)}
            existingIds={exercises.map((e) => e.exerciseId)}
          />
        )}

        {showReplaceFor !== null && (
          <ExerciseLibrary
            onAdd={handleReplaceExercise}
            onClose={() => setShowReplaceFor(null)}
            existingIds={[]}
            replaceMode
          />
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER: REST TIMER
  // ============================================================
  if (step === "rest" && activeWorkout?.restTimerStartedAt) {
    const nextEx = exercises[currentExIdx];
    const lastLoggedSet = nextEx?.loggedSets[nextEx.loggedSets.length - 1];
    const nextSuggestion = aiSuggestion;
    const restDuration = nextEx?.restSeconds ?? profile.restTimerDuration;

    return (
      <RestTimerCircle
        duration={restDuration}
        startedAt={activeWorkout.restTimerStartedAt}
        onSkip={handleRestComplete}
        nextExercise={nextEx?.exercise.name || "Next Exercise"}
        lastSet={lastLoggedSet ? { weight: lastLoggedSet.weight, reps: lastLoggedSet.reps } : null}
        suggestion={nextSuggestion}
        unit={unit}
        isPaused={isPaused}
      />
    );
  }

  // ============================================================
  // RENDER: INTER-EXERCISE REST
  // ============================================================
  if (step === "inter-exercise-rest") {
    const nextEx = exercises[interExNextIdx];
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <p className="text-[#FFD93D] text-sm font-semibold mb-1 uppercase tracking-wider">Exercise Complete</p>
        <p className="text-lg font-semibold mb-8">Next: {nextEx?.exercise.name || "Next Exercise"}</p>

        <div className="relative w-52 h-52 mb-8">
          {(() => {
            const circumference = 2 * Math.PI * 90;
            const elapsed = isPaused ? 0 : (Date.now() - interExRestStartedAt) / 1000;
            const remaining = Math.max(0, interExRestDuration - elapsed);
            const progress = remaining / interExRestDuration;
            const offset = circumference * (1 - progress);
            const mins = Math.floor(remaining / 60);
            const secs = Math.floor(remaining % 60);
            return (
              <>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="100" cy="100" r="90" fill="none"
                    stroke={isPaused ? "#8B8BA3" : "#FFD93D"} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-100"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isPaused ? (
                    <span className="text-3xl font-bold text-[#8B8BA3]">PAUSED</span>
                  ) : (
                    <span className="text-5xl font-bold tabular-nums text-[#FFD93D]">
                      {mins}:{secs.toString().padStart(2, "0")}
                    </span>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        <InterExerciseRestTimer
          duration={interExRestDuration}
          startedAt={interExRestStartedAt}
          isPaused={isPaused}
          onComplete={handleInterExRestComplete}
        />

        <Button
          onClick={handleInterExRestComplete}
          variant="outline"
          className="h-14 px-8 rounded-xl border-white/10 text-base font-semibold hover:bg-white/5"
        >
          <SkipForward className="w-5 h-5 mr-2" />
          Skip
        </Button>
      </div>
    );
  }

  // ============================================================
  // RENDER: COMPLETE
  // ============================================================
  if (step === "complete" && completedWorkout) {
    return (
      <WorkoutComplete
        workout={completedWorkout}
        profile={profile}
        onSave={handleSaveWorkout}
      />
    );
  }

  // ============================================================
  // RENDER: ACTIVE WORKOUT
  // ============================================================
  if (!currentExercise) return null;

  const setsLogged = currentExercise.loggedSets.length;
  const totalSetsTarget = currentExercise.defaultSets;
  const isTimedSet = (currentExercise.setDurationSeconds ?? 0) > 0;
  const setTimerDisplay = isTimedSet
    ? formatTime(timedRemaining * 1000)
    : formatTime(isPaused ? 0 : Date.now() - setStartedAt);

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{activeWorkout?.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums font-medium">
              {isPaused ? "PAUSED" : elapsedTime}
            </span>
          </div>
          {/* Pause / Resume button */}
          <button
            onClick={isPaused ? handleResume : handlePause}
            className={`touch-target flex items-center justify-center ml-1 ${isPaused ? "text-[#00E676]" : "text-muted-foreground"}`}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={handleFinishWorkout}
          className="touch-target flex items-center justify-center text-red-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* PAUSED overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <p className="text-4xl font-bold text-[#8B8BA3] tracking-widest">PAUSED</p>
          <Button
            onClick={handleResume}
            className="h-14 px-10 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90"
          >
            <Play className="w-5 h-5 mr-2" />
            Resume
          </Button>
        </div>
      )}

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
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{currentExercise.exercise.name}</h2>
              <p className="text-sm text-muted-foreground">{currentExercise.exercise.primaryMuscle}</p>
            </div>
            {/* Replace exercise button */}
            <button
              onClick={() => setShowReplaceFor(currentExIdx)}
              className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground bg-white/5 rounded-lg px-2 py-1.5 active:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replace
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Set <span className="text-[#6C5CE7]">{setsLogged + 1}</span> of {totalSetsTarget}
            </p>
            <div className={`flex items-center gap-1.5 text-xs ${isTimedSet ? "text-[#6C5CE7] font-semibold" : "text-muted-foreground"}`}>
              <Clock className="w-3 h-3" />
              <span className="tabular-nums">{setTimerDisplay}</span>
              {isTimedSet && <span className="text-[10px] text-muted-foreground">left</span>}
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

      {/* Replace exercise library */}
      {showReplaceFor !== null && (
        <ExerciseLibrary
          onAdd={handleReplaceExercise}
          onClose={() => setShowReplaceFor(null)}
          existingIds={[]}
          replaceMode
        />
      )}

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

// ---------- INTER-EXERCISE REST TIMER (headless — just fires onComplete) ----------
function InterExerciseRestTimer({ duration, startedAt, isPaused, onComplete }: {
  duration: number; startedAt: number; isPaused: boolean; onComplete: () => void;
}) {
  const firedRef = useRef(false);
  useEffect(() => {
    firedRef.current = false;
    const iv = setInterval(() => {
      if (isPaused) return;
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed >= duration && !firedRef.current) {
        firedRef.current = true;
        clearInterval(iv);
        onComplete();
      }
    }, 100);
    return () => clearInterval(iv);
  }, [duration, startedAt, isPaused, onComplete]);
  return null;
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
