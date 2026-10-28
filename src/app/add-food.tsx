import React, { useEffect, useState } from 'react';
import { TextInput, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, Card, Chips, Field, Screen, T, Title } from '../components/ui';
import { NumForm, NumInput } from '../components/NumForm';
import { addTo, toNumber } from '../lib/numpad';
import { first, save } from '../lib/db';
import { Food, Meal, MEALS, recentFoods, searchFoods } from '../lib/repo';
import { OffFood, searchOff } from '../lib/off';
import { addTemplateToDay, listTemplates, perPortion, Template } from '../lib/meals';
import { scaleFood } from '../lib/nutrition';
import { C } from '../lib/theme';
import { useLoad } from '../lib/hooks';

type Mode = 'search' | 'qty' | 'create';
const LABELS: Record<Meal, string> = { 'PETIT-DEJEUNER': 'Petit-déjeuner', DEJEUNER: 'Déjeuner', DINER: 'Dîner', COLLATIONS: 'Collations' };

export default function AddFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string; date: string; foodId?: string }>();
  const [meal, setMeal] = useState<Meal>((params.meal as Meal) ?? 'DEJEUNER');
  const [mode, setMode] = useState<Mode>(params.foodId ? 'qty' : 'search');
  const [q, setQ] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [foods] = useLoad(() => searchFoods(q.trim()), [q]);
  const [recents] = useLoad(recentFoods, []);
  const [tab, setTab] = useState<'Aliments' | 'Repas' | 'Recettes'>('Aliments');
  const [tpls, reloadTpls] = useLoad(() => listTemplates(), []);
  const [off, setOff] = useState<OffFood[]>([]);
  const [offBusy, setOffBusy] = useState(false);
  const [offError, setOffError] = useState(false);

  // Recherche en ligne (Open Food Facts) avec délai anti-rafale.
  useEffect(() => {
    const term = q.trim();
    setOff([]); setOffError(false);
    if (term.length < 3) return;
    setOffBusy(true);
    const t = setTimeout(() => {
      searchOff(term).then(setOff).catch(() => setOffError(true)).finally(() => setOffBusy(false));
    }, 600);
    return () => { clearTimeout(t); setOffBusy(false); };
  }, [q]);
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
            <Btn label={`AJOUTER · ${m.kcal} KCAL`} onPress={addEntry} />
          </>
        }
      >
        <T size={11} dim>{food.brand}</T>
        <Title>{food.name}</Title>
        <Chips options={MEALS} value={meal} onChange={setMeal} color={C.orange} />
        <Card accent={C.gold}>
          <NumInput big autoFocus value={grams} onChange={setGrams} unit="g" />
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

  const quickAdd = async (f: Food) => {
    const g = f.serving_g || 100;
    const m = scaleFood(f, g);
    await save('food_entries', { date: params.date, meal, name: f.name, grams: g, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat });
    router.back();
  };

  const pickOff = async (o: OffFood) => {
    const existing = o.barcode ? await first<Food>('SELECT * FROM foods WHERE barcode=? AND deleted=0', [o.barcode]) : null;
    if (existing) return pick(existing);
    const id = await save('foods', { ...o, custom: 0 });
    const f = await first<Food>('SELECT * FROM foods WHERE id=?', [id]);
    if (f) pick(f);
  };

  const shown = q.trim() ? foods ?? [] : recents ?? [];
  const addTpl = async (t: Template) => { await addTemplateToDay(t, params.date, meal, 1); router.back(); };
  const kindOf = tab === 'Repas' ? 'meal' : 'recipe';
  const tplList = (tpls ?? []).filter((t) => t.kind === kindOf);

  return (
    <Screen
      footer={
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} variant="gold" label="Scanner" onPress={() => router.push({ pathname: '/scan', params: { meal, date: params.date } })} />
            <Btn style={{ flex: 1 }} variant="orange" label="Créer un aliment" onPress={() => setMode('create')} />
          </View>
          <Btn variant="ghost" label={tab === 'Recettes' ? 'Nouvelle recette' : 'Nouveau repas enregistré'} onPress={() => router.push({ pathname: '/meal-builder', params: { kind: tab === 'Recettes' ? 'recipe' : 'meal' } })} />
        </>
      }
    >
      <Title>Ajouter · {LABELS[meal]}</Title>
      <Chips options={MEALS} value={meal} onChange={setMeal} color={C.accent} />
      <Chips options={['Aliments', 'Repas', 'Recettes'] as const} value={tab} onChange={(t) => { setTab(t); reloadTpls(); }} color={C.orange} />

      {tab !== 'Aliments' && (
        <>
          <T size={12} dim>{tab === 'Repas' ? 'Repas déjà faits : ajoute tous les aliments en un geste' : 'Recettes perso : ajoute une portion'}</T>
          {tplList.length === 0 && <T size={13} dim>Rien d'enregistré pour l'instant. Touche le bouton en bas pour en créer un.</T>}
          {tplList.map((t) => {
            const pp = perPortion(t);
            return (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 12, gap: 10 }}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/meal-builder', params: { kind: t.kind, id: t.id } })}>
                  <T size={15}>{t.name}</T>
                  <T size={12} dim>{pp.kcal} kcal{t.kind === 'recipe' ? ' / portion' : ''} · P {pp.protein} · G {pp.carbs} · L {pp.fat} · {t.items.length} aliments</T>
                </Pressable>
                <Pressable accessibilityLabel={`Ajouter ${t.name}`} onPress={() => addTpl(t)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <T size={22} color="#fff">+</T>
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      {tab === 'Aliments' && (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher un aliment ou un produit" placeholderTextColor={C.dim} autoCapitalize="none"
            style={{ backgroundColor: C.card, borderRadius: 14, color: C.text, fontSize: 16, padding: 14 }} />
          <T size={12} dim>{q.trim() ? 'Résultats' : 'Récents et courants'}</T>
          {shown.map((f) => (
            <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 12, gap: 10 }}>
              <Pressable style={{ flex: 1 }} onPress={() => pick(f)}>
                <T size={15}>{f.name}</T>
                <T size={12} dim>{f.brand ? `${f.brand} · ` : ''}{Math.round(f.kcal)} kcal/100 g · P {f.protein} · G {f.carbs} · L {f.fat}</T>
              </Pressable>
              <Pressable onPress={() => quickAdd(f)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                <T size={22} color="#fff">+</T>
              </Pressable>
            </View>
          ))}
          {q.trim().length >= 3 && (
            <>
              <T size={12} dim>Open Food Facts {offBusy ? '· recherche…' : ''}</T>
              {offError ? <T size={12} color={C.orange}>Recherche en ligne indisponible pour le moment.</T> : null}
              {off.map((o, i) => (
                <Pressable key={o.barcode + i} onPress={() => pickOff(o)} style={{ backgroundColor: C.card, borderRadius: 14, padding: 12 }}>
                  <T size={15}>{o.name}</T>
                  <T size={12} dim>{o.brand ? `${o.brand} · ` : ''}{o.kcal} kcal/100 g · P {o.protein} · G {o.carbs} · L {o.fat}</T>
                </Pressable>
              ))}
            </>
          )}
          {!!q.trim() && foods?.length === 0 && !off.length && !offBusy && <T size={13} dim>Aucun résultat local : scanne le produit ou crée l'aliment.</T>}
        </>
      )}
    </Screen>
  );
}
