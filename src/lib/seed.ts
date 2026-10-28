export type SeedExercise = { name: string; muscle: string; equipment: string; compound?: boolean };

export const MUSCLES = ['PECTORAUX', 'DOS', 'EPAULES', 'BICEPS', 'TRICEPS', 'QUADRICEPS', 'ISCHIOS', 'FESSIERS', 'MOLLETS', 'ABDOS'] as const;
export const EQUIPMENTS = ['BARRE', 'HALTERES', 'MACHINE', 'POULIE', 'POIDS DU CORPS'] as const;

export const SEED_EXERCISES: SeedExercise[] = [
  { name: 'DEVELOPPE COUCHE', muscle: 'PECTORAUX', equipment: 'BARRE', compound: true },
  { name: 'DEVELOPPE INCLINE HALTERES', muscle: 'PECTORAUX', equipment: 'HALTERES', compound: true },
  { name: 'ECARTES POULIE', muscle: 'PECTORAUX', equipment: 'POULIE' },
  { name: 'DIPS', muscle: 'PECTORAUX', equipment: 'POIDS DU CORPS', compound: true },
  { name: 'TRACTIONS', muscle: 'DOS', equipment: 'POIDS DU CORPS', compound: true },
  { name: 'ROWING BARRE', muscle: 'DOS', equipment: 'BARRE', compound: true },
  { name: 'SOULEVE DE TERRE', muscle: 'DOS', equipment: 'BARRE', compound: true },
  { name: 'TIRAGE POITRINE', muscle: 'DOS', equipment: 'POULIE' },
  { name: 'ROWING HALTERE', muscle: 'DOS', equipment: 'HALTERES' },
  { name: 'DEVELOPPE MILITAIRE', muscle: 'EPAULES', equipment: 'BARRE', compound: true },
  { name: 'ELEVATIONS LATERALES', muscle: 'EPAULES', equipment: 'HALTERES' },
  { name: 'OISEAU', muscle: 'EPAULES', equipment: 'HALTERES' },
  { name: 'CURL BARRE', muscle: 'BICEPS', equipment: 'BARRE' },
  { name: 'CURL MARTEAU', muscle: 'BICEPS', equipment: 'HALTERES' },
  { name: 'EXTENSION TRICEPS POULIE', muscle: 'TRICEPS', equipment: 'POULIE' },
  { name: 'BARRE AU FRONT', muscle: 'TRICEPS', equipment: 'BARRE' },
  { name: 'SQUAT', muscle: 'QUADRICEPS', equipment: 'BARRE', compound: true },
  { name: 'PRESSE A CUISSES', muscle: 'QUADRICEPS', equipment: 'MACHINE', compound: true },
  { name: 'LEG EXTENSION', muscle: 'QUADRICEPS', equipment: 'MACHINE' },
  { name: 'SOULEVE DE TERRE ROUMAIN', muscle: 'ISCHIOS', equipment: 'BARRE', compound: true },
  { name: 'LEG CURL', muscle: 'ISCHIOS', equipment: 'MACHINE' },
  { name: 'HIP THRUST', muscle: 'FESSIERS', equipment: 'BARRE', compound: true },
  { name: 'MOLLETS DEBOUT', muscle: 'MOLLETS', equipment: 'MACHINE' },
  { name: 'CRUNCH', muscle: 'ABDOS', equipment: 'POIDS DU CORPS' },
  { name: 'GAINAGE', muscle: 'ABDOS', equipment: 'POIDS DU CORPS' },
];

/** Modèles de programmes (par nom d'exercice du seed). */
export const TEMPLATES: Record<string, Record<string, string[]>> = {
  'PUSH / PULL / LEGS': {
    PUSH: ['DEVELOPPE COUCHE', 'DEVELOPPE MILITAIRE', 'DEVELOPPE INCLINE HALTERES', 'ELEVATIONS LATERALES', 'EXTENSION TRICEPS POULIE'],
    PULL: ['TRACTIONS', 'ROWING BARRE', 'TIRAGE POITRINE', 'OISEAU', 'CURL BARRE'],
    LEGS: ['SQUAT', 'SOULEVE DE TERRE ROUMAIN', 'PRESSE A CUISSES', 'LEG CURL', 'MOLLETS DEBOUT'],
  },
  'UPPER / LOWER': {
    UPPER: ['DEVELOPPE COUCHE', 'ROWING BARRE', 'DEVELOPPE MILITAIRE', 'TRACTIONS', 'CURL BARRE', 'EXTENSION TRICEPS POULIE'],
    LOWER: ['SQUAT', 'SOULEVE DE TERRE ROUMAIN', 'PRESSE A CUISSES', 'LEG CURL', 'MOLLETS DEBOUT', 'CRUNCH'],
  },
};
