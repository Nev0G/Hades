import { ViewStyle } from 'react-native';

// Thème sombre plat (cartes #1C1C1E sur noir, accent rouge) inspiré des apps de suivi de séances.
export const C = {
  bg: '#000000',
  card: '#1C1C1E',
  card2: '#2C2C2E',
  line: '#38383A',
  text: '#FFFFFF',
  dim: '#9A9AA0',
  accent: '#E5383B',
  green: '#34C759',
  doneBg: '#1F5F2A',
  red: '#FF453A',
  orange: '#FF9F0A',
  gold: '#FFD60A',
  ok: '#34C759',
  hi: '#2C2C2E',
  lo: '#000000',
};
export const MONO = 'JetBrainsMono_800ExtraBold';
export const MONO_REG = 'JetBrainsMono_500Medium';
export const SANS = undefined;
export const SANS_REG = undefined;
export const B = 0;
export const GLASSES_ML = 250;

/** Surface standard (carte, bouton neutre). */
export const raised = (_d = 6, radius = 16): ViewStyle => ({ backgroundColor: C.card, borderRadius: radius });
/** Surface en retrait (champ, piste de jauge, sélection). */
export const inset = (_d = 4, radius = 16): ViewStyle => ({ backgroundColor: C.card2, borderRadius: radius });

// ---- Couleur d'accent personnalisable ----
export const ACCENTS: { name: string; hex: string }[] = [
  { name: 'Rouge', hex: '#E5383B' }, { name: 'Orange', hex: '#F77F00' }, { name: 'Or', hex: '#E9B208' }, { name: 'Vert', hex: '#2BAE66' },
  { name: 'Turquoise', hex: '#14B8A6' }, { name: 'Bleu', hex: '#2F7BF6' }, { name: 'Violet', hex: '#8E5BD9' }, { name: 'Rose', hex: '#E64980' },
];
export const DEFAULT_ACCENT = ACCENTS[0].hex;
const listeners = new Set<() => void>();
/** Change l'accent et notifie la racine de l'app, qui se redessine entièrement. */
export function setAccent(hex: string) {
  C.accent = hex;
  listeners.forEach((l) => l());
}
export function onAccentChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
