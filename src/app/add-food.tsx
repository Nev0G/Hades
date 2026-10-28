import React, { useEffect, useState } from 'react';
import { TextInput, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, Card, Chips, Field, Screen, T, Title } from '../components/ui';
import { NumPad } from '../components/NumPad';
import { NumForm } from '../components/NumForm';
import { addTo, toNumber } from '../lib/numpad';
import { first, save } from '../lib/db';
import { Food, Meal, MEALS, searchFoods } from '../lib/repo';
import { scaleFood } from '../lib/nutrition';
import { C, SANS_REG, inset } from '../lib/theme';
import { useLoad } from '../lib/hooks';

type Mode = 'search' | 'qty' | 'create';

export default function AddFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string; date: string; foodId?: string }>();
  const [meal, setMeal] = useState<Meal>((params.meal as Meal) ?? 'DEJEUNER');
  const [mode, setMode] = useState<Mode>(params.foodId ? 'qty' : 'search');
  const [q, setQ] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [foods] = useLoad(() => searchFoods(q), [q]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [name, setName] = useState('');

  useEffect(() => {
    if (params.foodId) first<Food>('SELECT * FROM foods WHERE id=?', [params.foodId]).then((f) => { if (f) { setFood(f); setGrams(String(f.serving_g || 100)); } });
  }, [params.foodId]);

  const pick = (f: Food) => { setFood(f); setGrams(String(f.serving_g || 100)); setMode('qty'); };

  const addEntry = async () => {
    if (!food) return;
    const m = scaleFood(food, toNumber(grams));
    await save('food_entries', { date: params.date, meal, name: food.name, grams: toNumber(grams), kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat });
    router.back();
  };

  const createFood = async () => {
    const id = await save('foods', {
      name: name.toUpperCase(), brand: '', barcode: null, kcal: toNumber(form.kcal ?? ''), protein: toNumber(form.p ?? ''),
      carbs: toNumber(form.c ?? ''), fat: toNumber(form.f ?? ''), serving_g: toNumber(form.s ?? '') || 100, custom: 1,
    });
    const f = await first<Food>('SELECT * FROM foods WHERE id=?', [id]);
    if (f) pick(f);
  };

  if (mode === 'qty' && food) {
    const m = scaleFood(food, toNumber(grams));
    return (
      <Screen
        scroll={false}
        footer={
          <>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[-50, -10, 10, 50].map((d) => (<Btn key={d} size="sm" variant="ghost" style={{ flex: 1 }} label={`${d > 0 ? '+' : ''}${d}`} onPress={() => setGrams(addTo(grams, d))} />))}
            </View>
            <NumPad value={grams} onChange={setGrams} />
            <Btn label={`AJOUTER · ${m.kcal} KCAL`} onPress={addEntry} />
          </>
        }
      >
        <T size={11} dim>{food.brand}</T>
        <Title>{food.name}</Title>
        <Chips options={MEALS} value={meal} onChange={setMeal} color={C.orange} />
        <Card accent={C.gold}>
          <T size={56} color={C.gold}>{grams || '0'}<T size={18} dim> G</T></T>
          <T size={13}>{m.kcal} KCAL · P {m.protein} · G {m.carbs} · L {m.fat}</T>
        </Card>
      </Screen>
    );
  }

  if (mode === 'create') {
    return (
      <Screen
        footer={<>
          <Btn label="ENREGISTRER" disabled={!name || !toNumber(form.kcal ?? '')} onPress={createFood} />
          <Btn variant="ghost" label="ANNULER" onPress={() => setMode('search')} />
        </>}
      >
        <Title>NOUVEL ALIMENT</Title>
        <Field label="NOM" value={name} onChangeText={setName} />
        <T size={11} dim>VALEURS POUR 100 G</T>
        <NumForm
          fields={[{ key: 'kcal', label: 'KCAL' }, { key: 'p', label: 'PROTEINES', unit: 'G' }, { key: 'c', label: 'GLUCIDES', unit: 'G' }, { key: 'f', label: 'LIPIDES', unit: 'G' }, { key: 's', label: 'PORTION', unit: 'G' }]}
          values={form}
          onChange={setForm}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} variant="gold" label="SCANNER" onPress={() => router.push({ pathname: '/scan', params: { meal, date: params.date } })} />
            <Btn style={{ flex: 1 }} variant="orange" label="CREER" onPress={() => setMode('create')} />
          </View>
          <Btn variant="ghost" label="RECETTE" onPress={() => router.push('/recipe')} />
        </>
      }
    >
      <Title>AJOUTER · {meal}</Title>
      <Chips options={MEALS} value={meal} onChange={setMeal} color={C.orange} />
      <TextInput value={q} onChangeText={setQ} placeholder="RECHERCHER" placeholderTextColor={C.dim} autoCapitalize="characters"
        style={[inset(4, 16), { color: C.text, fontFamily: SANS_REG, fontSize: 18, padding: 14 }]} />
      {(foods ?? []).map((f) => (
        <Pressable key={f.id} onPress={() => pick(f)}>
          <Card>
            <T size={14}>{f.name}</T>
            <T size={11} dim>{f.brand} {f.custom ? '· PERSO' : ''} · {Math.round(f.kcal)} KCAL/100G</T>
          </Card>
        </Pressable>
      ))}
      {foods?.length === 0 && <T size={12} dim>AUCUN RESULTAT. SCANNE OU CREE L'ALIMENT.</T>}
    </Screen>
  );
}
