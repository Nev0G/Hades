import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../lib/theme';
import { T } from './ui';

/** Jauge en arc (270°) : valeur au centre, libellé dessous. */
export function Gauge({ value, max, size = 170, color = C.blue, label, center }: { value: number; max: number; size?: number; color?: string; label: string; center: string }) {
  const stroke = 14, r = (size - stroke) / 2, circ = 2 * Math.PI * r, arc = circ * 0.75;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const rot = `rotate(135 ${size / 2} ${size / 2})`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.card2} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${arc} ${circ}`} transform={rot} />
        {pct > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${arc * pct} ${circ}`} transform={rot} />}
      </Svg>
      <T size={44} style={{ textAlign: 'center' }}>{center}</T>
      <T size={13} dim>{label}</T>
    </View>
  );
}

/** Petit anneau de progression (repas). */
export function Ring({ value, max, size = 54, color = C.blue, children }: { value: number; max: number; size?: number; color?: string; children?: React.ReactNode }) {
  const stroke = 6, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.card2} strokeWidth={stroke} fill="none" />
        {pct > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={value > max ? C.red : color} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={`${circ * pct} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
      </Svg>
      {children}
    </View>
  );
}
