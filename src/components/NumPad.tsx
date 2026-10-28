import React from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, inset, raised } from '../lib/theme';
import { T } from './ui';
import { PadKey, applyKey } from '../lib/numpad';

const ROWS: PadKey[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'DEL']];

/** Pavé numérique géométrique : aucune ouverture du clavier système. */
export function NumPad({ value, onChange, onLongClear }: { value: string; onChange: (v: string) => void; onLongClear?: () => void }) {
  return (
    <View style={{ gap: 10 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(applyKey(value, k));
              }}
              onLongPress={k === 'DEL' ? () => (onLongClear ? onLongClear() : onChange('')) : undefined}
              style={({ pressed }) => [
                { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center' },
                pressed ? inset(4, 18) : raised(5, 18),
              ]}
            >
              <T size={26} color={k === 'DEL' ? C.red : C.text}>{k === 'DEL' ? '⌫' : k}</T>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
