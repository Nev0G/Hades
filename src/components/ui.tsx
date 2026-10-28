import React from 'react';
import { Pressable, Text, View, StyleSheet, TextInput, ViewStyle, TextStyle, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SANS, SANS_REG, MONO, inset, raised } from '../lib/theme';

export function T({ children, style, size = 14, color = C.text, dim, onPress }: { children: React.ReactNode; style?: TextStyle; size?: number; color?: string; dim?: boolean; onPress?: () => void }) {
  return (
    <Text onPress={onPress} style={[{ fontFamily: size >= 28 ? MONO : SANS, fontSize: size, color: dim ? C.dim : color, textTransform: 'uppercase', letterSpacing: size <= 14 ? 0.8 : 0 }, style]}>{children}</Text>
  );
}

export function Screen({ children, scroll = true, footer }: { children: React.ReactNode; scroll?: boolean; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 16, gap: 16 }}>{children}</View>
      )}
      {footer ? <View style={{ padding: 16, paddingBottom: 16 + insets.bottom * 0.5, gap: 8, backgroundColor: C.bg }}>{footer}</View> : null}
    </View>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: ViewStyle; accent?: string }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Btn({
  label, onPress, variant = 'red', style, disabled, haptic = true, size = 'lg',
}: { label: string; onPress: () => void; variant?: 'red' | 'gold' | 'orange' | 'ghost'; style?: ViewStyle; disabled?: boolean; haptic?: boolean; size?: 'lg' | 'sm' }) {
  const accent = variant === 'gold' ? C.gold : variant === 'orange' ? C.orange : variant === 'red' ? C.red : null;
  const fg = accent ?? C.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        s.btn, size === 'sm' && { paddingVertical: 10, paddingHorizontal: 12 },
        pressed ? inset(4, 20) : raised(6, 20),
        { opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      <T size={size === 'sm' ? 13 : 16} color={fg} style={{ textAlign: 'center' }}>{label}</T>
    </Pressable>
  );
}

export function Bar({ value, max, color = C.red, label, unit = 'G' }: { value: number; max: number; color?: string; label: string; unit?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size={12}>{label}</T>
        <T size={12} dim>{Math.round(value)} / {Math.round(max)} {unit}</T>
      </View>
      <View style={s.track}>
        <View style={{ width: `${pct * 100}%`, backgroundColor: value > max ? C.red : color, height: '100%', borderRadius: 8 }} />
      </View>
    </View>
  );
}

export function Field({ label, value, onChangeText, keyboardType, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'default' | 'email-address' | 'numeric'; placeholder?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <T size={11} dim>{label}</T>
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

export function Chips<V extends string>({ options, value, onChange, color = C.gold }: { options: readonly V[]; value: V | null; onChange: (v: V) => void; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[s.chip, on ? inset(3, 14) : raised(4, 14)]}>
            <T size={12} color={on ? color : C.dim}>{o}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Title = ({ children }: { children: React.ReactNode }) => <T size={28} style={{ letterSpacing: 1 }}>{children}</T>;

const s = StyleSheet.create({
  card: { ...raised(8, 24), padding: 18, gap: 10 },
  btn: { paddingVertical: 18, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 20 },
  track: { height: 14, ...inset(3, 8), overflow: 'hidden' },
  input: { ...inset(4, 16), color: C.text, fontFamily: SANS_REG, fontSize: 18, paddingVertical: 14, paddingHorizontal: 16 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
});
