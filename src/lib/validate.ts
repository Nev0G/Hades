export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const isUsername = (s: string) => /^[a-z0-9_]{3,20}$/.test(s);
export const normalizeUsername = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');

/** Force du mot de passe : 0 (trop court) à 4 (solide). */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (pw.length < 8) return { score: 0, label: pw.length ? 'Trop court (8 min.)' : '' };
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s) as 1 | 2 | 3 | 4;
  return { score, label: ['', 'Faible', 'Correct', 'Bon', 'Solide'][score] };
}

export type SignupForm = { username: string; email: string; password: string; confirm: string; consent: boolean };

/** Erreurs de saisie (champ -> message). Objet vide = formulaire valide. */
export function validateSignup(f: SignupForm): Partial<Record<keyof SignupForm, string>> {
  const e: Partial<Record<keyof SignupForm, string>> = {};
  if (!isUsername(f.username)) e.username = 'Pseudo : 3 à 20 caractères (a-z, 0-9, _).';
  if (!isEmail(f.email)) e.email = 'Adresse email invalide.';
  if (passwordStrength(f.password).score < 1) e.password = 'Mot de passe : 8 caractères minimum.';
  if (f.confirm !== f.password) e.confirm = 'Les mots de passe ne correspondent pas.';
  if (!f.consent) e.consent = 'Tu dois accepter les conditions et le traitement de tes données.';
  return e;
}
