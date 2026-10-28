import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { C } from '../lib/theme';
import { NumPad } from './NumPad';
import { T } from './ui';

export type NumFieldDef = { key: string; label: string; unit?: string };

/**
 * Champs numériques pilotés par le pavé custom (jamais de clavier système).
 * Mode autonome : affiche son propre pavé. Mode contrôlé (`activeKey` + `onActivate`) : le parent affiche un pavé unique.
 */
export function NumForm({ fields, values, onChange, activeKey, onActivate }: {
  fields: NumFieldDef[]; values: Record<string, string>; onChange: (v: Record<string, string>) => void;
  activeKey?: string | null; onActivate?: (key: string) => void;
}) {
  const controlled = onActivate !== undefined;
  const [own, setOwn] = useState(fields[0].key);
  const active = controlled ? activeKey : own;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }}>
        {fields.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => (controlled ? onActivate!(f.key) : setOwn(f.key))}
            style={{ width: '48%', padding: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 2, borderColor: f.key === active ? C.blue : 'transparent' }}
          >
            <T size={10} dim>{f.label}</T>
            <T size={22} color={f.key === active ? C.blue : C.text}>{values[f.key] || '0'}{f.unit ? ` ${f.unit}` : ''}</T>
          </Pressable>
        ))}
      </View>
      {!controlled && <NumPad value={values[own] ?? ''} onChange={(v) => onChange({ ...values, [own]: v })} />}
    </View>
  );
}
