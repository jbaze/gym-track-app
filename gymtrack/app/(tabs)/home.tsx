import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { WorkoutSession, Profile } from '../../src/types';
import { formatWorkoutDuration } from '../../src/lib/timers';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getSuggestedWorkout(lastType?: string): string {
  const rotations: Record<string, string> = {
    Push: 'Pull',
    Pull: 'Legs',
    Legs: 'Push',
    'Full Body': 'Full Body',
    Upper: 'Lower',
    Lower: 'Upper',
  };
  return rotations[lastType ?? ''] ?? 'Push';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [weekDays, setWeekDays] = useState<boolean[]>(Array(7).fill(false));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(3),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (sessionsRes.data) setRecentSessions(sessionsRes.data);

      // Compute weekly streak
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const weekSessionsRes = await supabase
        .from('workout_sessions')
        .select('started_at')
        .eq('user_id', user.id)
        .gte('started_at', startOfWeek.toISOString());

      const activeDays = Array(7).fill(false);
      (weekSessionsRes.data ?? []).forEach((s: { started_at: string }) => {
        const day = new Date(s.started_at).getDay();
        activeDays[day] = true;
      });
      setWeekDays(activeDays);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const suggested = getSuggestedWorkout(recentSessions[0]?.workout_type);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{profile?.name ?? 'Athlete'} 👋</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name ?? 'A')[0].toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Suggested Today */}
      <View style={styles.suggestedChip}>
        <Text style={styles.suggestedLabel}>SUGGESTED TODAY</Text>
        <Text style={styles.suggestedValue}>💪 {suggested} Day</Text>
      </View>

      {/* Start Workout CTA */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push('/workout/select')}
      >
        <Text style={styles.startButtonText}>START WORKOUT</Text>
        <Text style={styles.startButtonIcon}>→</Text>
      </TouchableOpacity>

      {/* Weekly Streak */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This Week</Text>
        <View style={styles.weekRow}>
          {DAYS.map((day, i) => (
            <View key={i} style={styles.dayCol}>
              <View style={[styles.dayCircle, weekDays[i] && styles.dayCircleActive]}>
                {weekDays[i] && <Text style={styles.dayCheck}>✓</Text>}
              </View>
              <Text style={styles.dayLabel}>{day}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Workouts */}
      <Text style={styles.sectionTitle}>Recent Workouts</Text>

      {loading ? (
        <ActivityIndicator color="#6C5CE7" style={{ marginTop: 20 }} />
      ) : recentSessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyText}>No workouts yet. Start your first!</Text>
        </View>
      ) : (
        recentSessions.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{session.workout_type}</Text>
              </View>
              <Text style={styles.sessionDate}>{formatDate(session.started_at)}</Text>
            </View>
            <View style={styles.sessionStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {session.duration_seconds
                    ? formatWorkoutDuration(session.duration_seconds)
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {session.total_volume_kg
                    ? `${session.total_volume_kg.toFixed(0)} kg`
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 15, color: '#8B8BA3' },
  name: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  suggestedChip: {
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.2)',
  },
  suggestedLabel: { fontSize: 11, color: '#8B8BA3', fontWeight: '700', letterSpacing: 1 },
  suggestedValue: { fontSize: 14, color: '#6C5CE7', fontWeight: '700' },
  startButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  startButtonText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  startButtonIcon: { fontSize: 22, color: '#FFFFFF' },
  card: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#8B8BA3', marginBottom: 14, letterSpacing: 1 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dayCircleActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  dayCheck: { fontSize: 14, color: '#0A0A0F', fontWeight: '800' },
  dayLabel: { fontSize: 12, color: '#8B8BA3', fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#8B8BA3', fontSize: 14 },
  sessionCard: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { color: '#6C5CE7', fontSize: 12, fontWeight: '700' },
  sessionDate: { color: '#8B8BA3', fontSize: 13 },
  sessionStats: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: '#8B8BA3', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
});
