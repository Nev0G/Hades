jest.mock('expo-sqlite', () => ({}));
import { mapWger } from '../lib/wger';
import { SEED_EXERCISES, MUSCLES, EQUIPMENTS } from '../lib/seed';

// Fiches réelles de l'API wger (exerciseinfo), tronquées.
const swing = { id: 9, category: { name: 'Abs' }, muscles: [{ id: 11 }, { id: 8 }], muscles_secondary: [{ id: 10 }, { id: 6 }], equipment: [{ id: 10 }],
  translations: [{ language: 2, name: '2 Handed Kettlebell Swing' }, { language: 7, name: 'Swing com kettlebell' }] };
const adduction = { id: 12, category: { name: 'Legs' }, muscles: [{ id: 8 }], muscles_secondary: [], equipment: [],
  translations: [{ language: 12, name: 'Adduction de hanche assise' }, { language: 1, name: 'Adduktoren-Maschine' }] };

test('mapWger : muscles, matériel, langue', () => {
  expect(mapWger(swing)).toEqual({ id: 'wger-9', name: '2 HANDED KETTLEBELL SWING', muscle: 'ISCHIOS', equipment: 'KETTLEBELL', compound: 1 });
  expect(mapWger(adduction)).toEqual({ id: 'wger-12', name: 'ADDUCTION DE HANCHE ASSISE', muscle: 'FESSIERS', equipment: 'POIDS DU CORPS', compound: 0 });
  expect(mapWger({ id: 1, category: { name: 'Cardio' }, muscles: [], muscles_secondary: [], equipment: [], translations: [{ language: 2, name: 'Run' }] })).toBeNull();
  expect(mapWger({ id: 2, category: { name: 'Arms' }, muscles: [], muscles_secondary: [], equipment: [], translations: [] })).toBeNull();
});

test('catalogue de base : >=120 exos, noms uniques, muscles/équipements valides', () => {
  expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(120);
  expect(new Set(SEED_EXERCISES.map((e) => e.name)).size).toBe(SEED_EXERCISES.length);
  for (const e of SEED_EXERCISES) {
    expect(MUSCLES).toContain(e.muscle);
    expect(EQUIPMENTS).toContain(e.equipment);
  }
});
