import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { registerAppStateHandler } from '../src/lib/appStateHandler';
import { useWorkoutStore } from '../src/store/workoutStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const restoreWorkout = useWorkoutStore((s) => s.restoreWorkout);

  useEffect(() => {
    registerAppStateHandler();
    restoreWorkout();

    Notifications.requestPermissionsAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout" />
        <Stack.Screen name="exercises" />
      </Stack>
    </>
  );
}
