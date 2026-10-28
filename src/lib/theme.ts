import { ViewStyle } from 'react-native';

// Thème sombre plat (cartes #1C1C1E sur noir, accent bleu) inspiré des apps de suivi de séances.
export const C = {
  bg: '#000000',
  card: '#1C1C1E',
  card2: '#2C2C2E',
  line: '#38383A',
  text: '#FFFFFF',
  dim: '#9A9AA0',
  blue: '#2F7BF6',
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
