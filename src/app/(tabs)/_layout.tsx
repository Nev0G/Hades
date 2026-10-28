import React from 'react';
import { Tabs } from 'expo-router';
import { C } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: { backgroundColor: C.bg, borderTopWidth: 0, height: 66, boxShadow: `0px -6px 14px ${C.lo}` },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.dim,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12, letterSpacing: 1 },
        tabBarIconStyle: { display: 'none' },
        tabBarLabelPosition: 'beside-icon',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'FOOD' }} />
      <Tabs.Screen name="train" options={{ title: 'TRAIN' }} />
      <Tabs.Screen name="stats" options={{ title: 'STATS' }} />
      <Tabs.Screen name="profile" options={{ title: 'PROFIL' }} />
    </Tabs>
  );
}
