import React from 'react';
import { Tabs } from 'expo-router';
import { C } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: { backgroundColor: C.card, borderTopWidth: 0, height: 62 },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.dim,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10, letterSpacing: 0, marginHorizontal: 0 },
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabelPosition: 'beside-icon',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'DASH' }} />
      <Tabs.Screen name="food" options={{ title: 'FOOD' }} />
      <Tabs.Screen name="train" options={{ title: 'TRAIN' }} />
      <Tabs.Screen name="stats" options={{ title: 'STATS' }} />
      <Tabs.Screen name="social" options={{ title: 'SOCIAL' }} />
      <Tabs.Screen name="profile" options={{ title: 'PROFIL' }} />
    </Tabs>
  );
}
