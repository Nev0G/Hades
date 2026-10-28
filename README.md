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

## Backend Supabase (synchro + social)

1. Crée un projet sur supabase.com.
2. Dans *SQL Editor*, exécute **dans cet ordre** `supabase/schema.sql` (données personnelles + RLS + bucket photos) puis `supabase/social.sql` (profils publics, amis, défis).
3. Copie `.env.example` en `.env` et renseigne l'URL et la clé *anon* (Settings > API), puis relance `npx expo start --clear`.
4. Auth > Providers : active Google / Apple si besoin, redirection `hades://auth`. Auth > Email : décide si la confirmation d'email est obligatoire (l'app gère les deux cas).

Sans configuration : mode local (données sur l'appareil, pas de social).

**Tester les règles d'accès (RLS)** sur un Postgres local jetable : `PGHOST=… PGUSER=… ./supabase/run_tests.sh` (affiche `RLS_OK`).
Les scores du classement et des défis sont calculés par l'app (mode « confiance ») : les données d'entraînement détaillées restent privées.

## Fonctions

- **Bibliothèque** : dossiers de routines (créer, renommer, supprimer), favoris, routines sans dossier ; menu ⋮ (éditer, renommer, dupliquer, déplacer, favori, supprimer) ; tri par récent / A→Z / plus utilisées / nombre d'exercices / création.
- **Récupération musculaire** : estimation par muscle d'après le volume et le délai depuis la dernière séance (`src/lib/recovery.ts`), affichée sur le dashboard ; une séance est conseillée selon la disponibilité de ses muscles.
- **Objectifs modifiables** (Profil > Mes objectifs) : calories, protéines / glucides / lipides (avec répartitions rapides), profil corporel, eau, séances par semaine, poids cible.
- **Repas enregistrés et recettes perso** : Nutrition > Ajouter > Repas / Recettes, ou « Enregistrer comme repas » depuis un repas du jour.
- **Visualisation musculaire** : API [Muscle Visualizer d'ExerciseDB](https://github.com/ExerciseDB/muscle-visualizer-api) si `EXPO_PUBLIC_RAPIDAPI_KEY` est défini (abonnement RapidAPI), avec repli automatique sur la silhouette hors-ligne.

## Exercices

120 exercices fournis hors-ligne + import de ~900 exercices depuis l'API ouverte [wger](https://wger.de) (Train > Bibliothèque > Importer). Recherche d'aliments : base locale + Open Food Facts.

## Gamification

- Rang par exercice (Wood → Olympian) selon le 1RM estimé rapporté au poids de corps (`src/lib/rank.ts`), barème différent pour les femmes.
- **Rang par muscle** (12 groupes) affiché sur une silhouette face/dos, plus un rang global (moyenne de tous les muscles).
- Niveau joueur et XP (chaque série validée rapporte de l'XP).
- Pendant une séance : toast « RANK UP » et « Nouveau record », résumé de fin avec XP gagnés.

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
