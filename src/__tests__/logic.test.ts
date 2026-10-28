import { computeTargets, tdee, scaleFood, recipePer100 } from '../lib/nutrition';
import { estimate1RM, best1RM, roundToPlate } from '../lib/strength';
import { applyKey, addTo, toNumber } from '../lib/numpad';

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

test('pavé numérique', () => {
  expect(applyKey('', '.')).toBe('0.');
  expect(applyKey('0.5', '.')).toBe('0.5');
  expect(applyKey('0', '7')).toBe('7');
  expect(applyKey('12', 'DEL')).toBe('1');
  expect(applyKey('1234567', '1')).toBe('1234567');
  expect(addTo('100', 2.5)).toBe('102.5');
  expect(toNumber('')).toBe(0);
});
