export type Sex = 'M' | 'F';
export type Goal = 'MASSE' | 'SECHE' | 'MAINTIEN';
export type Activity = 'SEDENTAIRE' | 'LEGER' | 'MODERE' | 'INTENSE' | 'EXTREME';

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  SEDENTAIRE: 1.2,
  LEGER: 1.375,
  MODERE: 1.55,
  INTENSE: 1.725,
  EXTREME: 1.9,
};

export const GOAL_DELTA: Record<Goal, number> = { MASSE: 0.1, SECHE: -0.2, MAINTIEN: 0 };

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export type ProfileInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activity: Activity;
};

/** Mifflin-St Jeor */
export function bmr({ sex, age, heightCm, weightKg }: ProfileInput): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'M' ? 5 : -161);
}

export function tdee(p: ProfileInput): number {
  return Math.round(bmr(p) * ACTIVITY_FACTOR[p.activity]);
}

/** Objectif calorique + macros : P 2 g/kg (1,8 en masse), L 25 % des kcal, G le reste. */
export function computeTargets(p: ProfileInput): Macros & { tdee: number } {
  const t = tdee(p);
  const kcal = Math.round(t * (1 + GOAL_DELTA[p.goal]));
  const protein = Math.round(p.weightKg * (p.goal === 'MASSE' ? 1.8 : 2));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { tdee: t, kcal, protein, carbs, fat };
}

export type FoodPer100 = { kcal: number; protein: number; carbs: number; fat: number };

export function scaleFood(f: FoodPer100, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: Math.round(f.kcal * k),
    protein: Math.round(f.protein * k * 10) / 10,
    carbs: Math.round(f.carbs * k * 10) / 10,
    fat: Math.round(f.fat * k * 10) / 10,
  };
}

/** Recette : macros pour 100 g à partir d'ingrédients (g + valeurs /100 g). */
export function recipePer100(items: { grams: number; food: FoodPer100 }[]): FoodPer100 & { totalGrams: number } {
  const total = items.reduce((s, i) => s + i.grams, 0);
  if (total <= 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0, totalGrams: 0 };
  const sum = items.reduce(
    (a, i) => {
      const m = scaleFood(i.food, i.grams);
      return { kcal: a.kcal + i.food.kcal * i.grams / 100, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const r = (v: number) => Math.round((v * 100) / total * 10) / 10;
  return { kcal: Math.round((sum.kcal * 100) / total), protein: r(sum.protein), carbs: r(sum.carbs), fat: r(sum.fat), totalGrams: total };
}
