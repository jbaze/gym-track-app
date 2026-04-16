import { useState, useMemo } from "react";
import { TrendingUp, Trophy, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  CompletedWorkout, UserProfile, BodyWeightEntry,
  EXERCISE_DATABASE, MUSCLE_GROUPS,
  getPersonalRecords, loadBodyWeight, saveBodyWeight, getExerciseById,
} from "@/lib/gymData";

interface ProgressScreenProps {
  history: CompletedWorkout[];
  profile: UserProfile;
}

type Tab = "volume" | "strength" | "body";

export default function ProgressScreen({ history, profile }: ProgressScreenProps) {
  const [tab, setTab] = useState<Tab>("volume");
  const [selectedExercise, setSelectedExercise] = useState<string>("bb-bench");
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>(loadBodyWeight());
  const [newWeight, setNewWeight] = useState("");
  const [showExerciseSelect, setShowExerciseSelect] = useState(false);

  const unit = profile.weightUnit;
  const prs = useMemo(() => getPersonalRecords(), [history]); // eslint-disable-line react-hooks/exhaustive-deps

  const volumeData = useMemo(() => {
    const muscleVolume: Record<string, number> = {};
    MUSCLE_GROUPS.forEach((m) => { muscleVolume[m] = 0; });
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    history
      .filter((w) => w.date >= fourWeeksAgo)
      .forEach((w) => {
        w.exercises.forEach((ex) => {
          const exercise = getExerciseById(ex.exerciseId);
          if (exercise) {
            const vol = ex.sets.reduce((s, set) => s + set.weight * set.reps, 0);
            muscleVolume[exercise.primaryMuscle] = (muscleVolume[exercise.primaryMuscle] || 0) + vol;
          }
        });
      });
    return MUSCLE_GROUPS
      .map((m) => ({ muscle: m, volume: muscleVolume[m] || 0 }))
      .filter((d) => d.volume > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [history]);

  const strengthData = useMemo(() => {
    const data: { date: string; weight: number }[] = [];
    const sorted = [...history].reverse();
    for (const w of sorted) {
      const ex = w.exercises.find((e) => e.exerciseId === selectedExercise);
      if (ex && ex.sets.length > 0) {
        const maxW = Math.max(...ex.sets.map((s) => s.weight));
        if (maxW > 0) {
          data.push({
            date: new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            weight: maxW,
          });
        }
      }
    }
    return data;
  }, [history, selectedExercise]);

  const bodyChartData = useMemo(() => {
    return bodyWeightEntries.map((e) => ({
      date: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: e.weight,
    }));
  }, [bodyWeightEntries]);

  const handleAddBodyWeight = () => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    const updated = [...bodyWeightEntries, { date: Date.now(), weight: w }];
    setBodyWeightEntries(updated);
    saveBodyWeight(updated);
    setNewWeight("");
  };

  const selectedExInfo = EXERCISE_DATABASE.find((e) => e.id === selectedExercise);
  const prEntries = Object.entries(prs);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "volume", label: "Volume", icon: <BarChart className="w-4 h-4" /> },
    { id: "strength", label: "Strength", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "body", label: "Body", icon: <Scale className="w-4 h-4" /> },
  ];

  return (
    <div className="safe-bottom px-4 pt-2 pb-4 animate-slide-up">
      <h1 className="text-2xl font-bold mb-4">Progress</h1>

      {/* Tabs */}
      <div className="flex bg-card rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "gym-gradient text-white shadow-lg shadow-purple-500/20"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* VOLUME TAB */}
      {tab === "volume" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Weekly volume per muscle group (last 4 weeks)</p>
          {volumeData.length > 0 ? (
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={volumeData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: "#8B8BA3", fontSize: 11 }} />
                  <YAxis dataKey="muscle" type="category" width={80} tick={{ fill: "#8B8BA3", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1C1C2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#A29BFE" }}
                    formatter={(value: number) => [`${value.toLocaleString()} ${unit}`, "Volume"]}
                  />
                  <Bar dataKey="volume" fill="#6C5CE7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-card border border-white/5 rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm">Complete workouts to see volume data</p>
            </div>
          )}
        </div>
      )}

      {/* STRENGTH TAB */}
      {tab === "strength" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowExerciseSelect(!showExerciseSelect)}
            className="w-full bg-card border border-white/10 rounded-xl p-3 flex items-center justify-between text-left"
          >
            <div>
              <p className="text-xs text-muted-foreground">Selected Exercise</p>
              <p className="font-medium text-sm">{selectedExInfo?.name || "Select exercise"}</p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </button>

          {showExerciseSelect && (
            <div className="bg-card border border-white/10 rounded-xl max-h-48 overflow-y-auto gym-scrollbar animate-slide-up">
              {EXERCISE_DATABASE.filter((e) => !e.isBodyweight).slice(0, 30).map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => { setSelectedExercise(ex.id); setShowExerciseSelect(false); }}
                  className={`w-full px-3 py-2.5 text-left text-sm border-b border-white/5 last:border-0 transition-colors ${
                    selectedExercise === ex.id ? "bg-[#6C5CE7]/10 text-[#A29BFE]" : "text-white/70 active:bg-white/5"
                  }`}
                >
                  {ex.name}
                  <span className="text-xs text-muted-foreground ml-2">{ex.primaryMuscle}</span>
                </button>
              ))}
            </div>
          )}

          {strengthData.length > 0 ? (
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <p className="text-sm font-medium mb-3">Max Weight Over Time</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={strengthData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#8B8BA3", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#8B8BA3", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1C1C2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#00E676" }}
                    formatter={(value: number) => [`${value} ${unit}`, "Max Weight"]}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#00E676" strokeWidth={2} dot={{ fill: "#00E676", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-card border border-white/5 rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm">No data for this exercise yet</p>
            </div>
          )}
        </div>
      )}

      {/* BODY TAB */}
      {tab === "body" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder={`Body weight (${unit})`}
              className="flex-1 h-11 bg-card border-white/10 rounded-xl"
            />
            <Button
              onClick={handleAddBodyWeight}
              className="h-11 px-4 gym-gradient text-white rounded-xl hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {bodyChartData.length > 0 ? (
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <p className="text-sm font-medium mb-3">Body Weight Trend</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bodyChartData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#8B8BA3", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#8B8BA3", fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1C1C2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#FFD93D" }}
                    formatter={(value: number) => [`${value} ${unit}`, "Weight"]}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#FFD93D" strokeWidth={2} dot={{ fill: "#FFD93D", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-card border border-white/5 rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm">Log your body weight to track trends</p>
            </div>
          )}
        </div>
      )}

      {/* Personal Records */}
      <div className="mt-6 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FFD93D]" />
          Personal Records
        </h2>
        {prEntries.length > 0 ? (
          <div className="space-y-2">
            {prEntries.map(([exId, pr]) => {
              const exercise = getExerciseById(exId);
              return (
                <div key={exId} className="bg-card border border-white/5 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFD93D]/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-[#FFD93D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{exercise?.name || exId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pr.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <p className="font-bold text-sm text-[#FFD93D] shrink-0">
                    {pr.weight}{unit} x {pr.reps}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-white/5 rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">Complete workouts to set personal records!</p>
          </div>
        )}
      </div>
    </div>
  );
}