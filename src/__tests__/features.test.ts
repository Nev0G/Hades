jest.mock('expo-sqlite', () => ({}));
import { computeRecovery, readiness, secondaryMuscles, RECOVERY_HOURS } from '../lib/recovery';
import { sortRoutines, tileColor, initials } from '../lib/routines';
import { balanceCarbs, macroKcal, splitFromPercent } from '../lib/goals';

const H = 3600 * 1000;
const NOW = Date.UTC(2026, 9, 28, 12);

test('récupération : fatigué juste après, prêt après le délai, frais si jamais travaillé', () => {
  const sets = Array.from({ length: 4 }, (_, i) => ({ muscle: 'PECTORAUX', exercise: 'DEVELOPPE COUCHE', done_at: NOW - 2 * H + i * 60000 }));
  const r = (t: number) => computeRecovery(sets, t).find((x) => x.muscle === 'PECTORAUX')!;
  expect(r(NOW).state).toBe('fatigue');
  expect(r(NOW).pct).toBeLessThan(10);
  expect(r(NOW + 40 * H).state).toBe('recovering');
  const ready = r(NOW + 96 * H);
  expect(ready.state).toBe('ready');
  expect(ready.pct).toBe(100);
  expect(ready.hoursLeft).toBe(0);
  expect(computeRecovery(sets, NOW).find((x) => x.muscle === 'DOS')!.state).toBe('rested');
  // les triceps sont sollicités en renfort (0,5 par série)
  const tri = computeRecovery(sets, NOW).find((x) => x.muscle === 'TRICEPS')!;
  expect(tri.load).toBe(2);
  expect(tri.state).toBe('fatigue');
});

test('récupération : plus de volume = plus long ; gros muscles plus lents', () => {
  const mk = (n: number, muscle: string) => Array.from({ length: n }, (_, i) => ({ muscle, exercise: 'X', done_at: NOW - H + i }));
  const few = computeRecovery(mk(2, 'BICEPS'), NOW).find((x) => x.muscle === 'BICEPS')!;
  const many = computeRecovery(mk(12, 'BICEPS'), NOW).find((x) => x.muscle === 'BICEPS')!;
  expect(many.hoursLeft).toBeGreaterThan(few.hoursLeft);
  const quads = computeRecovery(mk(4, 'QUADRICEPS'), NOW).find((x) => x.muscle === 'QUADRICEPS')!;
  const calves = computeRecovery(mk(4, 'MOLLETS'), NOW).find((x) => x.muscle === 'MOLLETS')!;
  expect(quads.hoursLeft).toBeGreaterThan(calves.hoursLeft);
  expect(RECOVERY_HOURS.QUADRICEPS).toBeGreaterThan(RECOVERY_HOURS.MOLLETS);
  expect(secondaryMuscles('SQUAT', 'QUADRICEPS')).toContain('FESSIERS');
  expect(secondaryMuscles('FACE PULL', 'EPAULES')).toEqual([]);
});

test('disponibilité d\'une routine', () => {
  const rec = [{ muscle: 'PECTORAUX', pct: 20 }, { muscle: 'DOS', pct: 100 }] as any;
  expect(readiness(['PECTORAUX', 'DOS'], rec)).toBe(60);
  expect(readiness([], rec)).toBe(100);
  expect(readiness(['BICEPS'], rec)).toBe(100);
});

test('tri des routines', () => {
  const l = [
    { name: 'Push', created_at: 1, lastDone: 500, uses: 3, exercises: 5 },
    { name: 'legs', created_at: 3, lastDone: null, uses: 0, exercises: 7 },
    { name: 'Abs', created_at: 2, lastDone: 900, uses: 8, exercises: 2 },
  ];
  expect(sortRoutines(l, 'recent').map((x) => x.name)).toEqual(['Abs', 'Push', 'legs']);
  expect(sortRoutines(l, 'az').map((x) => x.name)).toEqual(['Abs', 'legs', 'Push']);
  expect(sortRoutines(l, 'used').map((x) => x.name)).toEqual(['Abs', 'Push', 'legs']);
  expect(sortRoutines(l, 'exercises').map((x) => x.name)).toEqual(['legs', 'Push', 'Abs']);
  expect(sortRoutines(l, 'created').map((x) => x.name)).toEqual(['legs', 'Abs', 'Push']);
  expect(tileColor('Push')).toBe(tileColor('Push'));
  expect(initials('push a')).toBe('Pu');
});

test('macros personnalisées', () => {
  expect(macroKcal(150, 300, 70)).toBe(2430);
  expect(balanceCarbs(2430, 150, 70)).toBe(300);
  expect(balanceCarbs(100, 150, 70)).toBe(0);
  expect(splitFromPercent(2000, { p: 30, c: 40, f: 30 })).toEqual({ protein: 150, carbs: 200, fat: 67 });
});

import { VIEWS, layersFor, UNMAPPED } from '../lib/muscleMap';
import * as fs from 'fs';
import * as path from 'path';

test('carte musculaire wger : calques par vue, couleurs, images présentes', () => {
  const items = [{ muscle: 'PECTORAUX', color: '#FF453A' }, { muscle: 'BICEPS', color: '#34C759' }, { muscle: 'DOS', color: '#FF9F0A' }, { muscle: 'AVANT-BRAS', color: '#fff' }];
  expect(layersFor('front', items)).toEqual([{ id: 4, color: '#FF453A' }, { id: 1, color: '#34C759' }, { id: 13, color: '#34C759' }]);
  expect(layersFor('back', items)).toEqual([{ id: 12, color: '#FF9F0A' }]);
  expect(layersFor('front', [])).toEqual([]);
  expect(UNMAPPED).toContain('AVANT-BRAS');
  // chaque image référencée existe dans assets/muscles (sinon le bundle échouerait)
  const ids = new Set(Object.values(VIEWS).flatMap((v) => Object.values(v).flat()));
  for (const id of ids) expect(fs.existsSync(path.join(__dirname, `../../assets/muscles/m${id}.png`))).toBe(true);
  expect(fs.existsSync(path.join(__dirname, '../../assets/muscles/front.png'))).toBe(true);
  expect(fs.existsSync(path.join(__dirname, '../../assets/muscles/back.png'))).toBe(true);
});

