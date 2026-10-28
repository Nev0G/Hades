export type SeedExercise = { name: string; muscle: string; equipment: string; compound?: boolean };

export const MUSCLES = ['PECTORAUX', 'DOS', 'EPAULES', 'TRAPEZES', 'BICEPS', 'TRICEPS', 'AVANT-BRAS', 'ABDOS', 'QUADRICEPS', 'ISCHIOS', 'FESSIERS', 'MOLLETS'] as const;
export const EQUIPMENTS = ['BARRE', 'HALTERES', 'MACHINE', 'POULIE', 'POIDS DU CORPS', 'KETTLEBELL', 'ELASTIQUE'] as const;

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


const X = (muscle: string, equipment: string, names: string[], compound = false): SeedExercise[] => names.map((name) => ({ name, muscle, equipment, compound }));

SEED_EXERCISES.push(
  ...X('PECTORAUX', 'BARRE', ['DEVELOPPE INCLINE BARRE', 'DEVELOPPE DECLINE BARRE', 'DEVELOPPE COUCHE PRISE SERREE'], true),
  ...X('PECTORAUX', 'HALTERES', ['DEVELOPPE COUCHE HALTERES', 'ECARTES COUCHE HALTERES', 'PULLOVER HALTERE']),
  ...X('PECTORAUX', 'MACHINE', ['CHEST PRESS', 'PEC DECK'], true),
  ...X('PECTORAUX', 'POIDS DU CORPS', ['POMPES', 'POMPES DECLINEES'], true),
  ...X('PECTORAUX', 'POULIE', ['CROISE A LA POULIE HAUTE', 'CROISE A LA POULIE BASSE']),
  ...X('DOS', 'BARRE', ['ROWING PENCHE PRISE SUPINATION', 'TIRAGE MENTON', 'GOOD MORNING', 'ROWING T-BAR'], true),
  ...X('DOS', 'HALTERES', ['ROWING UNILATERAL', 'SHRUG HALTERES']),
  ...X('DOS', 'MACHINE', ['TIRAGE HORIZONTAL MACHINE', 'LOMBAIRES BANC A 45']),
  ...X('DOS', 'POULIE', ['TIRAGE HORIZONTAL POULIE', 'TIRAGE VERTICAL PRISE SERREE', 'PULL OVER POULIE', 'TIRAGE BRAS TENDUS']),
  ...X('DOS', 'POIDS DU CORPS', ['TRACTIONS PRISE NEUTRE', 'TRACTIONS SUPINATION', 'ROWING INVERSE'], true),
  ...X('EPAULES', 'BARRE', ['DEVELOPPE MILITAIRE DEBOUT', 'PUSH PRESS'], true),
  ...X('EPAULES', 'HALTERES', ['DEVELOPPE EPAULES HALTERES', 'ARNOLD PRESS', 'ELEVATIONS FRONTALES', 'OISEAU PENCHE'], false),
  ...X('EPAULES', 'POULIE', ['ELEVATIONS LATERALES POULIE', 'FACE PULL']),
  ...X('EPAULES', 'MACHINE', ['SHOULDER PRESS MACHINE', 'OISEAU MACHINE']),
  ...X('TRAPEZES', 'BARRE', ['SHRUG BARRE']),
  ...X('TRAPEZES', 'HALTERES', ['HAUSSEMENTS EPAULES HALTERES']),
  ...X('BICEPS', 'BARRE', ['CURL BARRE EZ', 'CURL PUPITRE']),
  ...X('BICEPS', 'HALTERES', ['CURL HALTERES ALTERNE', 'CURL INCLINE', 'CURL CONCENTRE']),
  ...X('BICEPS', 'POULIE', ['CURL POULIE BASSE', 'CURL POULIE HAUTE']),
  ...X('TRICEPS', 'HALTERES', ['EXTENSION TRICEPS HALTERE', 'KICKBACK TRICEPS']),
  ...X('TRICEPS', 'POULIE', ['EXTENSION TRICEPS CORDE', 'EXTENSION TRICEPS NUQUE POULIE']),
  ...X('TRICEPS', 'POIDS DU CORPS', ['DIPS BANC', 'POMPES DIAMANT'], true),
  ...X('TRICEPS', 'BARRE', ['EXTENSION TRICEPS BARRE EZ']),
  ...X('AVANT-BRAS', 'BARRE', ['CURL POIGNETS', 'CURL INVERSE']),
  ...X('AVANT-BRAS', 'HALTERES', ['CURL POIGNETS HALTERES', 'FARMER WALK']),
  ...X('ABDOS', 'POIDS DU CORPS', ['RELEVE DE JAMBES', 'RELEVE DE JAMBES SUSPENDU', 'PLANCHE LATERALE', 'MOUNTAIN CLIMBERS', 'RUSSIAN TWIST', 'CRUNCH INVERSE']),
  ...X('ABDOS', 'POULIE', ['CRUNCH POULIE HAUTE', 'WOODCHOPPER']),
  ...X('ABDOS', 'MACHINE', ['CRUNCH MACHINE']),
  ...X('QUADRICEPS', 'BARRE', ['FRONT SQUAT', 'SQUAT BULGARE', 'FENTES BARRE', 'SQUAT SUR BANC'], true),
  ...X('QUADRICEPS', 'HALTERES', ['GOBLET SQUAT', 'FENTES MARCHEES', 'SQUAT BULGARE HALTERES'], true),
  ...X('QUADRICEPS', 'MACHINE', ['HACK SQUAT', 'SQUAT MACHINE SMITH'], true),
  ...X('ISCHIOS', 'MACHINE', ['LEG CURL ASSIS', 'LEG CURL COUCHE']),
  ...X('ISCHIOS', 'HALTERES', ['SOULEVE DE TERRE ROUMAIN HALTERES', 'SOULEVE DE TERRE JAMBES TENDUES'], true),
  ...X('ISCHIOS', 'POIDS DU CORPS', ['NORDIC CURL']),
  ...X('FESSIERS', 'POULIE', ['KICKBACK POULIE']),
  ...X('FESSIERS', 'MACHINE', ['ABDUCTION MACHINE', 'HIP THRUST MACHINE']),
  ...X('FESSIERS', 'POIDS DU CORPS', ['PONT FESSIER', 'DONKEY KICK']),
  ...X('FESSIERS', 'HALTERES', ['HIP THRUST HALTERE', 'STEP UP'], true),
  ...X('MOLLETS', 'MACHINE', ['MOLLETS ASSIS', 'MOLLETS A LA PRESSE']),
  ...X('MOLLETS', 'POIDS DU CORPS', ['MOLLETS UNILATERAL']),
  ...X('MOLLETS', 'HALTERES', ['MOLLETS HALTERE']),
  ...X('QUADRICEPS', 'KETTLEBELL', ['GOBLET SQUAT KETTLEBELL'], true),
  ...X('FESSIERS', 'KETTLEBELL', ['KETTLEBELL SWING'], true),
  ...X('DOS', 'ELASTIQUE', ['TIRAGE ELASTIQUE']),
  ...X('EPAULES', 'ELASTIQUE', ['FACE PULL ELASTIQUE']),
);

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
