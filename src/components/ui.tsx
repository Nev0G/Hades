import React from 'react';
import { Pressable, Text, View, StyleSheet, TextInput, ViewStyle, TextStyle, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SANS, MONO } from '../lib/theme';

const KEEP: Record<string, string> = { tdee: 'TDEE', '1rm': '1RM', ok: 'OK', hades: 'HADES', ex: 'Ex', pr: 'PR', xp: 'XP', rm: 'RM' };
function soften(v: unknown, size: number): unknown {
  if (typeof v !== 'string' || size <= 12) return v;
  const w = v.length <= 2 ? v : v.toLowerCase().replace(/[a-zà-ÿ0-9']+/g, (m) => KEEP[m] ?? m);
  return v.length <= 2 ? v : w.charAt(0).toUpperCase() + w.slice(1);
}
export function T({ children, style, size = 14, color = C.text, dim, onPress }: { children: React.ReactNode; style?: TextStyle; size?: number; color?: string; dim?: boolean; onPress?: () => void }) {
  return (
    <Text onPress={onPress} style={[{ fontFamily: size >= 40 ? MONO : SANS, fontWeight: size >= 40 ? undefined : size >= 18 ? '700' : '600', fontSize: size, color: dim ? C.dim : color, textTransform: size <= 12 ? 'uppercase' : 'none', letterSpacing: size <= 12 ? 0.6 : 0 }, style]}>{Array.isArray(children) ? children.map((c, i) => <React.Fragment key={i}>{soften(c, size) as React.ReactNode}</React.Fragment>) : (soften(children, size) as React.ReactNode)}</Text>
  );
}

export function Screen({ children, scroll = true, footer }: { children: React.ReactNode; scroll?: boolean; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 16, gap: 14 }}>{children}</View>
      )}
      {footer ? <View style={{ padding: 16, paddingBottom: 16 + insets.bottom * 0.5, gap: 8, backgroundColor: C.bg }}>{footer}</View> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle; accent?: string }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Btn({
  label, onPress, variant = 'red', style, disabled, haptic = true, size = 'lg',
}: { label: string; onPress: () => void; variant?: 'red' | 'gold' | 'orange' | 'ghost'; style?: ViewStyle; disabled?: boolean; haptic?: boolean; size?: 'lg' | 'sm' }) {
  // 'red' = action principale (bleu) ; les autres variantes gardent leur couleur.
  const bg = variant === 'ghost' ? C.card2 : variant === 'gold' ? C.gold : variant === 'orange' ? C.orange : C.blue;
  const fg = variant === 'ghost' || variant === 'red' ? C.text : '#000';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        s.btn, size === 'sm' && { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <T size={size === 'sm' ? 13 : 16} color={fg} style={{ textAlign: 'center' }}>{label}</T>
    </Pressable>
  );
}

export function Bar({ value, max, color = C.blue, label, unit = 'g' }: { value: number; max: number; color?: string; label: string; unit?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size={13}>{label}</T>
        <T size={13} dim>{Math.round(value)} / {Math.round(max)} {unit}</T>
      </View>
      <View style={s.track}>
        <View style={{ width: `${pct * 100}%`, backgroundColor: value > max ? C.red : color, height: '100%', borderRadius: 6 }} />
      </View>
    </View>
  );
}

export function Field({ label, value, onChangeText, keyboardType, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'default' | 'email-address' | 'numeric'; placeholder?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T size={12} dim>{label}</T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={C.dim}
        autoCapitalize="none"
        style={s.input}
      />
    </View>
  );
}

export function Chips<V extends string>({ options, value, onChange, color = C.blue }: { options: readonly V[]; value: V | null; onChange: (v: V) => void; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[s.chip, { backgroundColor: on ? color : C.card2 }]}>
            <T size={12} color={on ? (color === C.blue ? '#fff' : '#000') : C.dim}>{o}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Title = ({ children }: { children: React.ReactNode }) => <T size={26}>{children}</T>;

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 10 },
  btn: { paddingVertical: 16, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 14 },
  track: { height: 10, backgroundColor: C.card2, borderRadius: 6, overflow: 'hidden' },
  input: { backgroundColor: C.card, borderRadius: 14, color: C.text, fontSize: 17, paddingVertical: 14, paddingHorizontal: 16 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20 },
});
