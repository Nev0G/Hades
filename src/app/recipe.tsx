import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Field, Screen, T, Title } from '../components/ui';
import { NumPad } from '../components/NumPad';
import { toNumber } from '../lib/numpad';
import { save } from '../lib/db';
import { Food, searchFoods } from '../lib/repo';
import { recipePer100 } from '../lib/nutrition';
import { useLoad } from '../lib/hooks';
import { B, C } from '../lib/theme';

type Item = { food: Food; grams: string };

/** Plat composé : ingrédients + grammes -> aliment perso (valeurs pour 100 g). */
export default function Recipe() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState(0);
  const [foods] = useLoad(() => searchFoods(''), []);
  const r = recipePer100(items.map((i) => ({ grams: toNumber(i.grams), food: i.food })));

  const setGrams = (g: string) => setItems(items.map((it, i) => (i === sel ? { ...it, grams: g } : it)));
  const finish = async () => {
    await save('foods', { name: name.toUpperCase(), brand: 'RECETTE', barcode: null, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, serving_g: r.totalGrams, custom: 1 });
    router.back();
  };

  return (
    <Screen footer={<>
      {items.length > 0 && <NumPad value={items[sel]?.grams ?? ''} onChange={setGrams} />}
      <Btn label="ENREGISTRER LA RECETTE" disabled={!name || r.totalGrams <= 0} onPress={finish} />
    </>}>
      <Title>RECETTE</Title>
      <Field label="NOM DU PLAT" value={name} onChangeText={setName} />
      {items.map((it, i) => (
        <Pressable key={i} onPress={() => setSel(i)} style={{ borderWidth: B, borderColor: i === sel ? C.gold : C.line, backgroundColor: C.card, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size={12} style={{ flex: 1 }}>{it.food.name}</T>
          <T size={14} color={C.gold}>{it.grams || '0'} G</T>
        </Pressable>
      ))}
      {r.totalGrams > 0 && <Card accent={C.gold}><T size={12}>TOTAL {r.totalGrams} G · {r.kcal} KCAL/100G · P {r.protein} G {r.carbs} L {r.fat}</T></Card>}
      <T size={11} dim>TOUCHER UN ALIMENT POUR L'AJOUTER</T>
      <View style={{ gap: 6 }}>
        {(foods ?? []).slice(0, 30).map((f) => (
          <Btn key={f.id} size="sm" variant="ghost" label={f.name} onPress={() => { setItems([...items, { food: f, grams: String(f.serving_g || 100) }]); setSel(items.length); }} />
        ))}
      </View>
    </Screen>
  );
}
