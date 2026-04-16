import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Profile, FitnessGoal, WeightUnit } from '../../src/types';

const FITNESS_GOALS: { value: FitnessGoal; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'weight_loss', label: 'Weight Loss' },
];

const REST_OPTIONS = [60, 90, 120, 150, 180, 240, 300];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? '');

    const [profileRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('workout_sessions')
        .select('started_at, total_volume_kg')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false }),
    ]);

    if (profileRes.data) setProfile(profileRes.data);

    const sessions = statsRes.data ?? [];
    setTotalWorkouts(sessions.length);
    setTotalVolume(
      sessions.reduce((sum: number, s: any) => sum + (s.total_volume_kg ?? 0), 0)
    );

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDays = new Set(
      sessions.map((s: any) => {
        const d = new Date(s.started_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    for (let i = 0; i <= 365; i++) {
      const check = new Date(today);
      check.setDate(today.getDate() - i);
      if (sessionDays.has(check.getTime())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    setStreakDays(streak);
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;
    setSaving(true);
    const updated = { ...profile, ...updates };
    setProfile(updated);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update(updates).eq('id', user.id);
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C5CE7" size="large" />
      </View>
    );
  }

  const initials = (profile?.name ?? email ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar & Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? 'Athlete'}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{(totalVolume / 1000).toFixed(1)}t</Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FFD93D' }]}>{streakDays}</Text>
          <Text style={styles.statLabel}>🔥 Streak</Text>
        </View>
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>Settings</Text>

      {/* Weight Unit */}
      <View style={styles.settingCard}>
        <Text style={styles.settingLabel}>WEIGHT UNIT</Text>
        <View style={styles.toggleRow}>
          {(['kg', 'lbs'] as WeightUnit[]).map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[
                styles.toggleBtn,
                profile?.weight_unit === unit && styles.toggleActive,
              ]}
              onPress={() => updateProfile({ weight_unit: unit })}
            >
              <Text style={[
                styles.toggleText,
                profile?.weight_unit === unit && styles.toggleTextActive,
              ]}>
                {unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rest Timer */}
      <View style={styles.settingCard}>
        <View style={styles.settingHeaderRow}>
          <Text style={styles.settingLabel}>DEFAULT REST TIMER</Text>
          <Text style={styles.settingValue}>{profile?.default_rest_seconds ?? 90}s</Text>
        </View>
        <View style={styles.restOptions}>
          {REST_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.restPill,
                profile?.default_rest_seconds === s && styles.restPillActive,
              ]}
              onPress={() => updateProfile({ default_rest_seconds: s })}
            >
              <Text style={[
                styles.restPillText,
                profile?.default_rest_seconds === s && styles.restPillTextActive,
              ]}>
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Fitness Goal */}
      <View style={styles.settingCard}>
        <Text style={styles.settingLabel}>FITNESS GOAL</Text>
        <View style={styles.goalRow}>
          {FITNESS_GOALS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[
                styles.goalPill,
                profile?.fitness_goal === g.value && styles.goalPillActive,
              ]}
              onPress={() => updateProfile({ fitness_goal: g.value })}
            >
              <Text style={[
                styles.goalPillText,
                profile?.fitness_goal === g.value && styles.goalPillTextActive,
              ]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {saving && (
        <View style={styles.savingRow}>
          <ActivityIndicator color="#6C5CE7" size="small" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: { flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48 },
  profileHeader: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  email: { fontSize: 14, color: '#8B8BA3' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#8B8BA3', marginTop: 4, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B8BA3',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  settingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingValue: { fontSize: 16, fontWeight: '700', color: '#6C5CE7' },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1C1C2E',
    borderRadius: 10,
    padding: 3,
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleActive: { backgroundColor: '#6C5CE7' },
  toggleText: { color: '#8B8BA3', fontSize: 14, fontWeight: '700' },
  toggleTextActive: { color: '#FFFFFF' },
  restOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  restPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  restPillActive: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderColor: '#6C5CE7',
  },
  restPillText: { color: '#8B8BA3', fontSize: 13, fontWeight: '600' },
  restPillTextActive: { color: '#6C5CE7' },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  goalPillActive: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderColor: '#6C5CE7',
  },
  goalPillText: { color: '#8B8BA3', fontSize: 13, fontWeight: '600' },
  goalPillTextActive: { color: '#6C5CE7' },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  savingText: { color: '#8B8BA3', fontSize: 13 },
  signOutButton: {
    backgroundColor: 'rgba(255,80,80,0.12)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.3)',
  },
  signOutText: { color: '#FF5050', fontSize: 15, fontWeight: '700' },
});
