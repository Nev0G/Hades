import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type Notifs = typeof import('expo-notifications');
let cached: Notifs | null | undefined;

/** expo-notifications n'est pas disponible dans Expo Go (Android) : on le charge à la demande, jamais à l'import. */
export function getNotifications(): Notifs | null {
  if (cached !== undefined) return cached;
  const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS === 'web' || (inExpoGo && Platform.OS === 'android')) return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cached = require('expo-notifications') as Notifs;
  } catch {
    cached = null;
  }
  return cached;
}
