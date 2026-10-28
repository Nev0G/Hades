import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CATEGORY = 'rest';
let notifId: string | null = null;

export async function initRestNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.requestPermissionsAsync().catch(() => {});
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest', { name: 'REPOS', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 400, 200, 400] }).catch(() => {});
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: 'skip', buttonTitle: 'PASSER LE REPOS', options: { opensAppToForeground: true } },
    { identifier: 'plus30', buttonTitle: '+30 S', options: { opensAppToForeground: true } },
  ]).catch(() => {});
}

/** Notification locale à l'échéance du repos : visible sur l'écran de verrouillage. */
export async function scheduleRestEnd(seconds: number, label: string) {
  await cancelRestEnd();
  if (Platform.OS === 'web') return;
  try {
    notifId = await Notifications.scheduleNotificationAsync({
      content: { title: 'REPOS TERMINE', body: label, categoryIdentifier: CATEGORY, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)), channelId: 'rest' },
    });
  } catch { notifId = null; }
}

export async function cancelRestEnd() {
  if (notifId) await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
  notifId = null;
}

export function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
