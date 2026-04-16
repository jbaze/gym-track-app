import * as Notifications from 'expo-notifications';

export function getRestRemaining(endAtMs: number): number {
  return Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
}

export function getRepElapsed(startedAtMs: number): number {
  return Math.floor((Date.now() - startedAtMs) / 1000);
}

export function getWorkoutElapsed(startedAtMs: number): number {
  return Math.floor((Date.now() - startedAtMs) / 1000);
}

export async function scheduleRestNotification(endAtMs: number): Promise<string> {
  const trigger = new Date(endAtMs);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rest Complete!',
      body: 'Time to start your next set 💪',
      sound: true,
    },
    trigger,
  });
  return id;
}

export async function cancelRestNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatWorkoutDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
