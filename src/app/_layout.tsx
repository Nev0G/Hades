import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, JetBrainsMono_800ExtraBold, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import * as Notifications from 'expo-notifications';
import { getDb } from '../lib/db';
import { getSession } from '../lib/auth';
import { getProfile } from '../lib/repo';
import { startSyncLoop } from '../lib/sync';
import { C } from '../lib/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function Root() {
  const [fontsLoaded] = useFonts({ JetBrainsMono_800ExtraBold, JetBrainsMono_500Medium });
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<'login' | 'onboarding' | 'app'>('login');
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      await getDb();
      const s = await getSession();
      const p = await getProfile();
      setRoute(!s ? 'login' : !p ? 'onboarding' : 'app');
      setReady(true);
    })();
    return startSyncLoop();
  }, []);

  // Garde de navigation : relit l'état à chaque changement d'écran racine.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const s = await getSession();
      const p = s ? await getProfile() : null;
      const target = !s ? 'login' : !p ? 'onboarding' : 'app';
      const seg = segments[0] as string | undefined;
      if (target === 'login' && seg !== 'login') router.replace('/login');
      else if (target === 'onboarding' && seg !== 'onboarding') router.replace('/onboarding');
      else if (target === 'app' && (seg === 'login' || seg === 'onboarding' || seg === undefined)) router.replace('/(tabs)');
    })();
  }, [ready, segments, route]);

  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'none' }} />
    </SafeAreaProvider>
  );
}
