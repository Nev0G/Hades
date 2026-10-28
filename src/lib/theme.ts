import { ViewStyle } from 'react-native';

// Néomorphisme sombre : une seule teinte de surface, relief créé par deux ombres (claire haut-gauche, sombre bas-droite).
export const C = {
  bg: '#22252C',
  card: '#22252C',
  card2: '#22252C',
  line: '#3A3F4B',
  text: '#ECEEF4',
  dim: '#8D93A3',
  red: '#FF5A5F',
  orange: '#FF9248',
  gold: '#FFC857',
  ok: '#FFC857',
  hi: '#2D313A',
  lo: '#16181D',
};
export const MONO = 'JetBrainsMono_800ExtraBold';
export const MONO_REG = 'JetBrainsMono_500Medium';
// Police système (aucune dépendance de police supplémentaire) pour les textes courants.
export const SANS = undefined;
export const SANS_REG = undefined;
export const B = 0;
export const GLASSES_ML = 250;

const sh = (d: number) => `${d}px ${d}px ${d * 2}px ${C.lo}, -${d}px -${d}px ${d * 2}px ${C.hi}`;
const shIn = (d: number) => `inset ${d}px ${d}px ${d * 1.5}px ${C.lo}, inset -${d}px -${d}px ${d * 1.5}px ${C.hi}`;

/** Relief sortant (cartes, boutons). */
export const raised = (d = 6, radius = 20): ViewStyle => ({ backgroundColor: C.bg, borderRadius: radius, boxShadow: sh(d) });
/** Relief rentrant (champs, jauges, état pressé / sélectionné). */
export const inset = (d = 4, radius = 20): ViewStyle => ({ backgroundColor: C.bg, borderRadius: radius, boxShadow: shIn(d) });
