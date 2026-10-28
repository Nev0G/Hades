import { computeTargets, tdee, scaleFood, recipePer100 } from '../lib/nutrition';
import { estimate1RM, best1RM, roundToPlate } from '../lib/strength';
import { sanitizeNumber, addTo, toNumber } from '../lib/numpad';

const base = { sex: 'M' as const, age: 30, heightCm: 180, weightKg: 80, goal: 'MAINTIEN' as const, activity: 'MODERE' as const };

test('TDEE Mifflin-St Jeor homme 30a 180cm 80kg modéré', () => {
  // BMR = 800 + 1125 - 150 + 5 = 1780 ; x1.55 = 2759
  expect(tdee(base)).toBe(2759);
});

test('macros : cohérence kcal', () => {
  const t = computeTargets({ ...base, goal: 'SECHE' });
  expect(t.kcal).toBe(Math.round(2759 * 0.8));
  expect(t.protein).toBe(160);
  const back = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  expect(Math.abs(back - t.kcal)).toBeLessThanOrEqual(6);
});

test('femme : BMR plus bas', () => {
  expect(tdee({ ...base, sex: 'F' })).toBeLessThan(tdee(base));
});

test('scaleFood', () => {
  expect(scaleFood({ kcal: 200, protein: 10, carbs: 20, fat: 5 }, 150)).toEqual({ kcal: 300, protein: 15, carbs: 30, fat: 7.5 });
});

test('recette /100g', () => {
  const r = recipePer100([
    { grams: 100, food: { kcal: 100, protein: 10, carbs: 0, fat: 0 } },
    { grams: 100, food: { kcal: 300, protein: 0, carbs: 50, fat: 10 } },
  ]);
  expect(r).toEqual({ kcal: 200, protein: 5, carbs: 25, fat: 5, totalGrams: 200 });
});

test('1RM', () => {
  expect(estimate1RM(100, 1)).toBe(100);
  expect(estimate1RM(100, 5)).toBeGreaterThan(112);
  expect(estimate1RM(100, 5)).toBeLessThan(120);
  expect(estimate1RM(0, 5)).toBe(0);
  expect(best1RM([{ weight: 100, reps: 5 }, { weight: 110, reps: 3 }])).toBeGreaterThan(115);
  expect(roundToPlate(101)).toBe(100);
});

test('saisie numérique (clavier natif)', () => {
  expect(sanitizeNumber('12')).toBe('12');
  expect(sanitizeNumber('.')).toBe('0.');
  expect(sanitizeNumber('2,5')).toBe('2.5');
  expect(sanitizeNumber('1.2.3')).toBe('1.23');
  expect(sanitizeNumber('ab7c')).toBe('7');
  expect(sanitizeNumber('-5')).toBe('5');
  expect(sanitizeNumber('12345678901')).toBe('1234567');
  expect(sanitizeNumber('')).toBe('');
  expect(addTo('100', 2.5)).toBe('102.5');
  expect(toNumber('')).toBe(0);
});

import { rankFor, standardFor, levelFromXp, setXp, TIERS } from '../lib/rank';

test('rang développé couché : 100 kg à 80 kg de poids de corps', () => {
  const std = standardFor('DEVELOPPE COUCHE', 'BARRE', true);
  const r = rankFor(std, 100, 80, 'M'); // ratio 1.25 => PLATINUM
  expect(r.tier).toBe('PLATINUM');
  expect(r.nextKg).toBe(120);
  expect(rankFor(std, 20, 80, 'M').tier).toBe('WOOD');
  expect(rankFor(std, 400, 80, 'M').tier).toBe('OLYMPIAN');
  expect(rankFor(std, 400, 80, 'M').progress).toBe(1);
});

test('rang femme plus accessible, poids de corps, progression', () => {
  const std = standardFor('DEVELOPPE COUCHE', 'BARRE', true);
  expect(TIERS.indexOf(rankFor(std, 60, 60, 'F').tier)).toBeGreaterThan(TIERS.indexOf(rankFor(std, 60, 60, 'M').tier));
  const bw = standardFor('TRACTIONS', 'POIDS DU CORPS', true);
  expect(bw.bodyweight).toBe(true);
  expect(rankFor(bw, 80 * 1.4, 80, 'M').tier).toBe('PLATINUM');
  expect(standardFor('LEG EXTENSION', 'MACHINE', false).thresholds[1]).toBeLessThan(0.2);
});

test('xp et niveau', () => {
  expect(setXp(100, 5)).toBe(20);
  expect(levelFromXp(0).level).toBe(1);
  expect(levelFromXp(60).level).toBe(2);
  const l = levelFromXp(100);
  expect(l.progress).toBeGreaterThan(0);
  expect(l.progress).toBeLessThan(1);
});

import { muscleScore, tierOfScore, overallScore } from '../lib/rank';

test('rang par muscle', () => {
  expect(muscleScore([])).toBeNull();
  expect(muscleScore([3.5])).toBe(3.5);
  // meilleur 5, top3 = (5+3+1)/3=3 => (5+3)/2 = 4
  expect(muscleScore([5, 3, 1, 0])).toBe(4);
  expect(tierOfScore(4.2)).toBe('PLATINUM');
  expect(tierOfScore(99)).toBe('OLYMPIAN');
  expect(overallScore([4, null, 2, null])).toBe(1.5);
});

import { isEmail, isUsername, normalizeUsername, passwordStrength, validateSignup } from '../lib/validate';

test('validation inscription', () => {
  expect(isEmail('a@b.co')).toBe(true);
  expect(isEmail('a@b')).toBe(false);
  expect(isEmail('a b@c.fr')).toBe(false);
  expect(isUsername('iron_man')).toBe(true);
  expect(isUsername('ab')).toBe(false);
  expect(isUsername('Iron Man')).toBe(false);
  expect(normalizeUsername('  Iron Man ')).toBe('iron_man');
  expect(passwordStrength('abc').score).toBe(0);
  expect(passwordStrength('abcdefgh').score).toBe(1);
  expect(passwordStrength('Abcdefgh12!x').score).toBe(4);
  const ok = { username: 'iron_man', email: 'a@b.co', password: 'secret123', confirm: 'secret123', consent: true };
  expect(validateSignup(ok)).toEqual({});
  expect(Object.keys(validateSignup({ ...ok, confirm: 'x', consent: false })).sort()).toEqual(['confirm', 'consent']);
});
