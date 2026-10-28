import { getNotifications } from './notif';
import { Platform } from 'react-native';

const CATEGORY = 'rest';
let notifId: string | null = null;

export async function initRestNotifications() {
  const Notifications = getNotifications();
  if (!Notifications) return;
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
  startRestActivity(seconds, label);
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    notifId = await Notifications.scheduleNotificationAsync({
      content: { title: 'REPOS TERMINE', body: label, categoryIdentifier: CATEGORY, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)), channelId: 'rest' },
    });
  } catch { notifId = null; }
}

export async function cancelRestEnd() {
  stopRestActivity();
  const Notifications = getNotifications();
  if (notifId && Notifications) await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
  notifId = null;
}

export function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ---- Live Activity iOS (écran verrouillé / Dynamic Island) ----
let activityId: string | undefined;

export async function startRestActivity(seconds: number, label: string) {
  if (Platform.OS !== 'ios') return;
  try {
    const LA = await import('expo-live-activity');
    await stopRestActivity();
    activityId = LA.startActivity(
      { title: 'REPOS', subtitle: label, progressBar: { date: Date.now() + seconds * 1000 } },
      { backgroundColor: '#000000', titleColor: '#FFC400', subtitleColor: '#FFFFFF', progressViewTint: '#FF1E1E', timerType: 'digital' },
    ) || undefined;
  } catch { activityId = undefined; }
}

export async function stopRestActivity() {
  if (Platform.OS !== 'ios' || !activityId) return;
  try {
    const LA = await import('expo-live-activity');
    LA.stopActivity(activityId, { title: 'REPOS TERMINE' });
  } catch { /* module absent (Expo Go) */ }
  activityId = undefined;
}
