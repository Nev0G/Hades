import React from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { B, C } from '../lib/theme';
import { T } from './ui';
import { PadKey, applyKey } from '../lib/numpad';

const ROWS: PadKey[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'DEL']];

/** Pavé numérique géométrique : aucune ouverture du clavier système. */
export function NumPad({ value, onChange, onLongClear }: { value: string; onChange: (v: string) => void; onLongClear?: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
          {row.map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(applyKey(value, k));
              }}
              onLongPress={k === 'DEL' ? () => (onLongClear ? onLongClear() : onChange('')) : undefined}
              style={({ pressed }) => ({
                flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: B, borderColor: C.line,
                backgroundColor: pressed ? C.orange : k === 'DEL' ? C.red : C.card2,
              })}
            >
              <T size={26} color={k === 'DEL' ? '#000' : C.text}>{k === 'DEL' ? '⌫' : k}</T>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
