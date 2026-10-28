import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, JetBrainsMono_800ExtraBold, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { getNotifications } from '../lib/notif';
import { getDb, kvGet } from '../lib/db';
import { getSession } from '../lib/auth';
import { getProfile } from '../lib/repo';
import { startSyncLoop } from '../lib/sync';
import { C, onAccentChange } from '../lib/theme';

getNotifications()?.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function Root() {
  const [fontsLoaded, fontError] = useFonts({ JetBrainsMono_800ExtraBold, JetBrainsMono_500Medium });
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [themeVer, setThemeVer] = useState(0);
  const [route, setRoute] = useState<'login' | 'onboarding' | 'app'>('login');
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        const savedAccent = await kvGet('accent');
        if (savedAccent) C.accent = savedAccent;
        const s = await getSession();
        const p = await getProfile();
        setRoute(!s ? 'login' : !p ? 'onboarding' : 'app');
      } catch (e: any) {
        setInitError(String(e?.message ?? e));
      }
      setReady(true);
    })();
    const stopSync = startSyncLoop();
    const stopTheme = onAccentChange(() => setThemeVer((v) => v + 1));
    return () => { stopSync(); stopTheme(); };
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

  if (initError) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: C.red, fontSize: 18 }}>ERREUR AU DEMARRAGE</Text>
        <Text style={{ color: C.text, marginTop: 12 }}>{initError}</Text>
      </View>
    );
  }
  // Polices : on n'attend pas indéfiniment si le chargement échoue (police système en repli).
  if ((!fontsLoaded && !fontError) || !ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack key={themeVer} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'none' }} />
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ color: C.red, fontSize: 18 }}>ERREUR</Text>
      <Text style={{ color: C.text }}>{error.message}</Text>
      <Text style={{ color: C.gold, fontSize: 16 }} onPress={retry}>REESSAYER</Text>
    </View>
  );
}
