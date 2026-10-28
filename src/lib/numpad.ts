/** Logique pure du pavé numérique sur-mesure. */
export type PadKey = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'.'|'DEL'|'CLR';

export function applyKey(value: string, key: PadKey, maxLen = 7): string {
  if (key === 'CLR') return '';
  if (key === 'DEL') return value.slice(0, -1);
  if (key === '.') {
    if (value.includes('.')) return value;
    return value === '' ? '0.' : value + '.';
  }
  if (value.length >= maxLen) return value;
  if (value === '0') return key;
  return value + key;
}

export function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function addTo(value: string, delta: number): string {
  const n = Math.max(0, Math.round((toNumber(value) + delta) * 100) / 100);
  return String(n);
}
