import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { PersonalRecord } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 180;

type TabType = 'Volume' | 'Strength' | 'PRs';

interface WeeklyVolume {
  week: string;
  volume: number;
}

interface StrengthPoint {
  date: string;
  orm: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SimpleBarChart({ data }: { data: WeeklyVolume[] }) {
  if (!data.length) return (
    <View style={chartStyles.empty}>
      <Text style={chartStyles.emptyText}>No volume data yet</Text>
    </View>
  );

  const maxVal = Math.max(...data.map((d) => d.volume), 1);
  const barWidth = (CHART_WIDTH - 32) / data.length - 8;

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((item, i) => {
          const heightPct = item.volume / maxVal;
          const barHeight = Math.max(4, heightPct * (CHART_HEIGHT - 40));
          return (
            <View key={i} style={[chartStyles.barCol, { width: barWidth }]}>
              <Text style={chartStyles.barValue}>
                {item.volume > 0 ? `${(item.volume / 1000).toFixed(1)}k` : ''}
              </Text>
              <View style={[chartStyles.bar, { height: barHeight }]} />
              <Text style={chartStyles.barLabel}>{item.week}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SimpleLineChart({ data }: { data: StrengthPoint[] }) {
  if (!data.length) return (
    <View style={chartStyles.empty}>
      <Text style={chartStyles.emptyText}>No strength data yet</Text>
    </View>
  );

  const maxVal = Math.max(...data.map((d) => d.orm), 1);
  const minVal = Math.min(...data.map((d) => d.orm), 0);
  const range = maxVal - minVal || 1;
  const stepX = (CHART_WIDTH - 40) / Math.max(data.length - 1, 1);

  const points = data.map((item, i) => ({
    x: 20 + i * stepX,
    y: CHART_HEIGHT - 40 - ((item.orm - minVal) / range) * (CHART_HEIGHT - 60),
    orm: item.orm,
    date: item.date,
  }));

  return (
    <View style={chartStyles.container}>
      <View style={{ height: CHART_HEIGHT - 20 }}>
        {points.map((pt, i) => (
          <View
            key={i}
            style={[
              chartStyles.dot,
              { left: pt.x - 5, top: pt.y - 5 },
            ]}
          />
        ))}
        {points.length > 1 && points.map((pt, i) => {
          if (i === points.length - 1) return null;
          const next = points[i + 1];
          const dx = next.x - pt.x;
          const dy = next.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`line-${i}`}
              style={[
                chartStyles.line,
                {
                  left: pt.x,
                  top: pt.y,
                  width: len,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
      </View>
      <View style={chartStyles.xLabels}>
        {points.map((pt, i) => (
          <Text key={i} style={[chartStyles.xLabel, { left: pt.x - 20 }]}>
            {pt.date}
          </Text>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingHorizontal: 0,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 6,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: '#6C5CE7',
    borderRadius: 4,
    width: '100%',
    opacity: 0.85,
  },
  barValue: {
    fontSize: 9,
    color: '#8B8BA3',
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 10,
    color: '#8B8BA3',
    marginTop: 4,
  },
  empty: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#8B8BA3',
    fontSize: 14,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C5CE7',
    borderWidth: 2,
    borderColor: '#0A0A0F',
  },
  line: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#6C5CE7',
    opacity: 0.6,
    transformOrigin: 'left center',
  },
  xLabels: {
    position: 'relative',
    height: 20,
  },
  xLabel: {
    position: 'absolute',
    fontSize: 9,
    color: '#8B8BA3',
    width: 40,
    textAlign: 'center',
  },
});

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('Volume');
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolume[]>([]);
  const [prs, setPrs] = useState<(PersonalRecord & { exercise_name?: string })[]>([]);
  const [strengthData, setStrengthData] = useState<StrengthPoint[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load weekly volume for last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('started_at, total_volume_kg')
      .eq('user_id', user.id)
      .gte('started_at', eightWeeksAgo.toISOString())
      .order('started_at', { ascending: true });

    // Aggregate by week
    const weekMap: Record<string, number> = {};
    (sessions ?? []).forEach((s: { started_at: string; total_volume_kg?: number }) => {
      const d = new Date(s.started_at);
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const key = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weekMap[key] = (weekMap[key] ?? 0) + (s.total_volume_kg ?? 0);
    });

    setWeeklyVolume(
      Object.entries(weekMap).map(([week, volume]) => ({ week, volume })).slice(-8)
    );

    // Load PRs with exercise names
    const { data: prData } = await supabase
      .from('personal_records')
      .select('*, exercises(name)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false });

    const mappedPRs = (prData ?? []).map((pr: any) => ({
      ...pr,
      exercise_name: pr.exercises?.name ?? 'Unknown',
    }));
    setPrs(mappedPRs);

    // Load exercises for dropdown
    const { data: exData } = await supabase
      .from('exercises')
      .select('id, name')
      .order('name', { ascending: true });

    setExercises(exData ?? []);
    if (exData && exData.length > 0) {
      setSelectedExercise(exData[0].id);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedExercise) return;
    loadStrengthData(selectedExercise);
  }, [selectedExercise]);

  const loadStrengthData = async (exerciseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('personal_records')
      .select('one_rep_max, achieved_at')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .order('achieved_at', { ascending: true })
      .limit(10);

    setStrengthData(
      (data ?? []).map((d: any) => ({
        date: formatDate(d.achieved_at),
        orm: d.one_rep_max,
      }))
    );
  };

  const TABS: TabType[] = ['Volume', 'Strength', 'PRs'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Progress</Text>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#6C5CE7" style={{ marginTop: 40 }} />
      ) : (
        <>
          {activeTab === 'Volume' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weekly Volume (kg)</Text>
              <Text style={styles.cardSubtitle}>Last 8 weeks</Text>
              <SimpleBarChart data={weeklyVolume} />
            </View>
          )}

          {activeTab === 'Strength' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Estimated 1RM Trend</Text>

              {/* Exercise selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.exerciseScroll}
                contentContainerStyle={styles.exerciseScrollContent}
              >
                {exercises.slice(0, 12).map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[
                      styles.exPill,
                      selectedExercise === ex.id && styles.exPillActive,
                    ]}
                    onPress={() => setSelectedExercise(ex.id)}
                  >
                    <Text style={[
                      styles.exPillText,
                      selectedExercise === ex.id && styles.exPillTextActive,
                    ]}>
                      {ex.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <SimpleLineChart data={strengthData} />
            </View>
          )}

          {activeTab === 'PRs' && (
            <View>
              {prs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🏆</Text>
                  <Text style={styles.emptyText}>No PRs yet. Keep lifting!</Text>
                </View>
              ) : (
                <>
                  {/* Header row */}
                  <View style={styles.prHeader}>
                    <Text style={[styles.prHeaderCell, { flex: 2 }]}>Exercise</Text>
                    <Text style={styles.prHeaderCell}>Weight</Text>
                    <Text style={styles.prHeaderCell}>Reps</Text>
                    <Text style={styles.prHeaderCell}>1RM</Text>
                  </View>
                  {prs.map((pr) => (
                    <View key={pr.id} style={styles.prRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.prExName}>{pr.exercise_name}</Text>
                        <Text style={styles.prDate}>{formatDate(pr.achieved_at)}</Text>
                      </View>
                      <Text style={styles.prCell}>{pr.weight_kg}kg</Text>
                      <Text style={styles.prCell}>{pr.reps}</Text>
                      <Text style={[styles.prCell, styles.prORM]}>{pr.one_rep_max.toFixed(1)}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#6C5CE7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B8BA3',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#8B8BA3',
    marginBottom: 12,
  },
  exerciseScroll: { marginVertical: 12 },
  exerciseScrollContent: { gap: 8, paddingRight: 8 },
  exPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  exPillActive: {
    backgroundColor: 'rgba(108,92,231,0.25)',
    borderColor: '#6C5CE7',
  },
  exPillText: {
    fontSize: 12,
    color: '#8B8BA3',
    fontWeight: '600',
  },
  exPillTextActive: {
    color: '#6C5CE7',
  },
  emptyCard: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#8B8BA3', fontSize: 14 },
  prHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#141420',
    borderRadius: 10,
    marginBottom: 8,
  },
  prHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#8B8BA3',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  prExName: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  prDate: { fontSize: 11, color: '#8B8BA3', marginTop: 2 },
  prCell: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  prORM: { color: '#FFD93D' },
});
