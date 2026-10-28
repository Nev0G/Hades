import React from 'react';
import { TextInput, View } from 'react-native';
import { C } from '../lib/theme';
import { sanitizeNumber } from '../lib/numpad';
import { T } from './ui';

export type NumFieldDef = { key: string; label: string; unit?: string };

/** Saisie numérique avec le clavier natif du téléphone. */
export function NumInput({ value, onChange, unit, big, autoFocus, width, placeholder = '0', align = 'left' }: {
  value: string; onChange: (v: string) => void; unit?: string; big?: boolean; autoFocus?: boolean; width?: number | string; placeholder?: string; align?: 'left' | 'center';
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', width: width as any }}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(sanitizeNumber(t))}
        keyboardType="decimal-pad"
        inputMode="decimal"
        returnKeyType="done"
        selectTextOnFocus
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={C.dim}
        style={{ flex: 1, color: C.text, fontSize: big ? 44 : 20, fontWeight: '700', paddingVertical: big ? 6 : 2, textAlign: align }}
      />
      {unit ? <T size={big ? 18 : 13} dim>{unit}</T> : null}
    </View>
  );
}

/** Grille de champs numériques (clavier natif). */
export function NumForm({ fields, values, onChange }: { fields: NumFieldDef[]; values: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
      {fields.map((f) => (
        <View key={f.key} style={{ width: '48%', padding: 12, borderRadius: 14, backgroundColor: C.card2 }}>
          <T size={10} dim>{f.label}</T>
          <NumInput value={values[f.key] ?? ''} onChange={(v) => onChange({ ...values, [f.key]: v })} unit={f.unit} />
        </View>
      ))}
    </View>
  );
}
