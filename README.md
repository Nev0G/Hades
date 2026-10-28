# HADES

Tracking musculation & nutrition. Neo-brutalist, noir/rouge/orange/or, offline-first.
Stack : Expo (React Native) + Expo Router, SQLite local, sync Supabase.

## Lancer

```bash
npm install
npx expo start        # Expo Go pour tester ; dev build requis pour certains modules natifs
npm test              # logique pure : TDEE, macros, 1RM, pavé numérique
npm run typecheck
```

## Backend (optionnel)

1. Créer un projet Supabase, exécuter `supabase/schema.sql` (tables + RLS par utilisateur).
2. Définir `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Activer les providers Google / Apple dans Supabase et ajouter l'URL de redirection `hades://auth`.

Sans configuration : mode local (données sur l'appareil, SSO indisponible).

## Architecture

- `src/lib/db.ts` : SQLite, écriture locale instantanée + file `outbox` ; `sync.ts` l'envoie dès que le réseau revient.
- `src/lib/nutrition.ts`, `strength.ts`, `numpad.ts` : logique pure testée.
- `src/app` : écrans (FOOD, TRAIN, STATS, PROFIL, scan, RUN SÉANCE, recettes, exercices).
- Open Food Facts : `src/lib/off.ts` (résultat mis en cache dans `foods`).

## Limites connues

- Live Activities iOS : branchées via `expo-live-activity` (build natif requis, pas Expo Go) ; notification locale avec actions sur Android.
- Photos de progression : envoyées vers le bucket Supabase `photos` à la synchro.
- Pas encore testé sur appareil physique ; le bundle Android compile.
- Phase 2 (montres, export CSV) non traitée ; export JSON disponible dans PROFIL.
