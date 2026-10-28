import React from 'react';
import { Tabs } from 'expo-router';
import { C, B, MONO } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: { backgroundColor: C.bg, borderTopWidth: B, borderTopColor: C.line, height: 64 },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.dim,
        tabBarLabelStyle: { fontFamily: MONO, fontSize: 11 },
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
