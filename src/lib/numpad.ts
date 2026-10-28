/** Nettoie une saisie numérique du clavier natif : chiffres, une seule virgule/point (normalisé en point). */
export function sanitizeNumber(raw: string, maxLen = 7): string {
  let out = '';
  let dot = false;
  for (const ch of raw.replace(/,/g, '.')) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === '.' && !dot) { dot = true; out += out === '' ? '0.' : '.'; }
    if (out.length >= maxLen) break;
  }
  return out;
}

export function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function addTo(value: string, delta: number): string {
  const n = Math.max(0, Math.round((toNumber(value) + delta) * 100) / 100);
  return String(n);
}
