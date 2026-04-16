import { AppState } from 'react-native';
import { loadRestTimer, loadRepTimer } from './workoutPersistence';
import { useWorkoutStore } from '../store/workoutStore';

export function registerAppStateHandler() {
  AppState.addEventListener('change', async (nextState) => {
    if (nextState === 'active') {
      const restState = await loadRestTimer();
      const repState = await loadRepTimer();
      const store = useWorkoutStore.getState();

      if (restState) {
        const remaining = Math.max(0, Math.ceil((restState.endAtMs - Date.now()) / 1000));
        if (remaining <= 0) {
          store.onRestComplete();
        } else {
          store.syncRestTimer(restState.endAtMs);
        }
      }

      if (repState) {
        store.syncRepTimer(repState.startedAtMs);
      }
    }
  });
}
