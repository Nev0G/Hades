import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { C, inset, raised } from '../lib/theme';
import { NumPad } from './NumPad';
import { T } from './ui';

export type NumFieldDef = { key: string; label: string; unit?: string };

/** Série de champs numériques pilotés par le pavé custom (jamais de clavier système). */
export function NumForm({ fields, values, onChange }: { fields: NumFieldDef[]; values: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const [active, setActive] = useState(fields[0].key);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }}>
        {fields.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setActive(f.key)}
            style={[{ width: '48%', padding: 12 }, f.key === active ? inset(4, 16) : raised(5, 16)]}
          >
            <T size={10} dim>{f.label}</T>
            <T size={22} color={f.key === active ? C.gold : C.text}>{values[f.key] || '0'}{f.unit ? ` ${f.unit}` : ''}</T>
          </Pressable>
        ))}
      </View>
      <NumPad value={values[active] ?? ''} onChange={(v) => onChange({ ...values, [active]: v })} />
    </View>
  );
}
