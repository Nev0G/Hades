import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, Card, Screen, T, Title } from '../components/ui';
import { NumInput } from '../components/NumForm';
import { toNumber } from '../lib/numpad';
import { Food, recentFoods, searchFoods } from '../lib/repo';
import { getTemplate, MealItem, perPortion, saveTemplate, deleteTemplate } from '../lib/meals';
import { scaleFood } from '../lib/nutrition';
import { useLoad } from '../lib/hooks';
import { C } from '../lib/theme';

type Row = { name: string; grams: string; kcal100: number; p100: number; c100: number; f100: number };

/** Création / édition d'un repas enregistré (kind=meal) ou d'une recette perso (kind=recipe, avec portions). */
export default function MealBuilder() {
  const router = useRouter();
  const { kind: k, id } = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind = k === 'recipe' ? 'recipe' : 'meal';
  const [name, setName] = useState('');
  const [portions, setPortions] = useState('2');
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [foods] = useLoad(() => (q.trim() ? searchFoods(q.trim()) : recentFoods()), [q]);

  useEffect(() => {
    if (!id) return;
    getTemplate(id).then((t) => {
      if (!t) return;
      setName(t.name); setPortions(String(t.portions));
      setRows(t.items.map((i) => ({ name: i.name, grams: String(i.grams), kcal100: (i.kcal / (i.grams || 1)) * 100, p100: (i.protein / (i.grams || 1)) * 100, c100: (i.carbs / (i.grams || 1)) * 100, f100: (i.fat / (i.grams || 1)) * 100 })));
    });
  }, [id]);

  const items: MealItem[] = rows.map((r) => {
    const m = scaleFood({ kcal: r.kcal100, protein: r.p100, carbs: r.c100, fat: r.f100 }, toNumber(r.grams));
    return { name: r.name, grams: toNumber(r.grams), ...m };
  });
  const tpl = { items, portions: toNumber(portions) || 1, kind } as const;
  const pp = perPortion(tpl);
  const total = items.reduce((a, i) => a + i.kcal, 0);

  const add = (f: Food) => setRows([...rows, { name: f.name, grams: String(f.serving_g || 100), kcal100: f.kcal, p100: f.protein, c100: f.carbs, f100: f.fat }]);
  return (
    <Screen footer={<>
      <Btn label={id ? 'Enregistrer les modifications' : kind === 'recipe' ? 'Enregistrer la recette' : 'Enregistrer le repas'} disabled={!name.trim() || items.length === 0 || total <= 0}
        onPress={async () => { await saveTemplate({ id, name, kind, portions: toNumber(portions) || 1, items }); router.back(); }} />
      {id && <Btn variant="ghost" label="Supprimer" onPress={async () => { await deleteTemplate(id); router.back(); }} />}
    </>}>
      <Title>{kind === 'recipe' ? 'Recette perso' : 'Repas enregistré'}</Title>
      <TextInput value={name} onChangeText={setName} placeholder={kind === 'recipe' ? 'Nom de la recette' : 'Nom du repas (ex. Petit-déj protéiné)'} placeholderTextColor={C.dim}
        style={{ backgroundColor: C.card, color: C.text, borderRadius: 14, padding: 14, fontSize: 17 }} />
      {kind === 'recipe' && (
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={14} dim>Nombre de portions</T>
          <NumInput value={portions} onChange={setPortions} width={90} align="center" />
        </View>
      )}
      {rows.map((r, i) => (
        <View key={i} style={{ backgroundColor: C.card, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T size={15}>{r.name}</T>
            <T size={12} dim>{items[i].kcal} kcal · P {items[i].protein} · G {items[i].carbs} · L {items[i].fat}</T>
          </View>
          <View style={{ backgroundColor: C.card2, borderRadius: 10, paddingHorizontal: 10 }}>
            <NumInput value={r.grams} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, grams: v } : x)))} unit="g" width={90} align="center" />
          </View>
          <T size={20} color={C.red} onPress={() => setRows(rows.filter((_, j) => j !== i))}>✕</T>
        </View>
      ))}
      {items.length > 0 && (
        <Card>
          <T size={16}>{kind === 'recipe' ? 'Par portion' : 'Total'} : {pp.kcal} kcal</T>
          <T size={13} dim>P {pp.protein} g · G {pp.carbs} g · L {pp.fat} g · {pp.grams} g</T>
        </Card>
      )}
      <T size={14}>Ajouter un aliment</T>
      <TextInput value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={C.dim} style={{ backgroundColor: C.card, color: C.text, borderRadius: 14, padding: 12, fontSize: 16 }} />
      <View style={{ gap: 6 }}>
        {(foods ?? []).slice(0, 60).map((f) => (
          <Pressable key={f.id} onPress={() => add(f)} style={{ backgroundColor: C.card, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}><T size={14}>{f.name}</T><T size={11} dim>{Math.round(f.kcal)} kcal/100 g</T></View>
            <T size={22} color={C.accent}>+</T>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
