import React from 'react';
import { View } from 'react-native';
import { T } from './ui';
import { C } from '../lib/theme';

export const AVATAR_EMOJIS = ['💪', '🏋️', '🔥', '⚡', '🦾', '🦍', '🐺', '🦁', '🐯', '🦅', '🐉', '🦈', '🤖', '👑', '🎯', '🚀', '💀', '😈', '🥷', '🧠', '🍗', '🥊', '⛰️', '🏆'];
export const AVATAR_COLORS = ['#E5383B', '#F77F00', '#E9B208', '#2BAE66', '#14B8A6', '#2F7BF6', '#8E5BD9', '#E64980', '#6B7280', '#111827'];
export const TITLES = ['Débutant motivé', 'Rat de salle', 'Machine à squats', 'Team développé couché', 'Mode sèche', 'Mode prise de masse', 'Jamais sans cardio', 'Régulier comme une horloge'];

/** Pastille de profil : emoji sur fond de couleur (initiale si aucun avatar choisi). */
export function Avatar({ emoji, color, name, size = 48 }: { emoji?: string | null; color?: string | null; name?: string | null; size?: number }) {
  const bg = color || C.accent;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {emoji ? <T size={size * 0.5}>{emoji}</T> : <T size={size * 0.42} color="#fff">{(name ?? '?').trim().charAt(0).toUpperCase() || '?'}</T>}
    </View>
  );
}
