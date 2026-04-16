import * as SecureStore from 'expo-secure-store';
import { ActiveWorkout, RestTimerState, RepTimerState } from '../types';

const WORKOUT_KEY = 'active_workout';
const REST_KEY = 'rest_timer';
const REP_KEY = 'rep_timer';

export async function saveActiveWorkout(workout: ActiveWorkout): Promise<void> {
  await SecureStore.setItemAsync(WORKOUT_KEY, JSON.stringify(workout));
}

export async function loadActiveWorkout(): Promise<ActiveWorkout | null> {
  const data = await SecureStore.getItemAsync(WORKOUT_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearActiveWorkout(): Promise<void> {
  await SecureStore.deleteItemAsync(WORKOUT_KEY);
}

export async function saveRestTimer(state: RestTimerState): Promise<void> {
  await SecureStore.setItemAsync(REST_KEY, JSON.stringify(state));
}

export async function loadRestTimer(): Promise<RestTimerState | null> {
  const data = await SecureStore.getItemAsync(REST_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearRestTimer(): Promise<void> {
  await SecureStore.deleteItemAsync(REST_KEY);
}

export async function saveRepTimer(state: RepTimerState): Promise<void> {
  await SecureStore.setItemAsync(REP_KEY, JSON.stringify(state));
}

export async function loadRepTimer(): Promise<RepTimerState | null> {
  const data = await SecureStore.getItemAsync(REP_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearRepTimer(): Promise<void> {
  await SecureStore.deleteItemAsync(REP_KEY);
}
