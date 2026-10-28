import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Bar, Btn, Card, Screen, T } from '../../components/ui';
import { dateKey, remove } from '../../lib/db';
import { useLoad } from '../../lib/hooks';
import { entriesFor, getProfile, getWater, MEALS, setWater } from '../../lib/repo';
import { C, GLASSES_ML } from '../../lib/theme';

export default function Journal() {
  const router = useRouter();
  const [date, setDate] = useState(dateKey(new Date()));
  const [data, reload] = useLoad(async () => ({
    profile: await getProfile(), entries: await entriesFor(date), water: await getWater(date),
  }), [date]);

  const shift = (d: number) => {
    const [y, m, day] = date.split('-').map(Number);
    setDate(dateKey(new Date(y, m - 1, day + d)));
  };
  if (!data || !data.profile) return <Screen><T>...</T></Screen>;
  const { profile: p, entries, water } = data;
  const sum = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.protein, c: a.c + e.carbs, f: a.f + e.fat }), { kcal: 0, p: 0, c: 0, f: 0 });
  const left = p.kcal - sum.kcal;

  return (
    <Screen
      footer={<Btn label="+ AJOUTER UN ALIMENT" onPress={() => router.push({ pathname: '/add-food', params: { meal: 'DEJEUNER', date } })} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Btn size="sm" variant="ghost" label="<" onPress={() => shift(-1)} />
        <T size={16}>{date}</T>
        <Btn size="sm" variant="ghost" label=">" onPress={() => shift(1)} />
      </View>

      <Card accent={left < 0 ? C.red : C.gold}>
        <T size={11} dim>KCAL CONSOMMEES</T>
        <T size={56} color={left < 0 ? C.red : C.gold}>{Math.round(sum.kcal)}</T>
        <T size={13}>/ {p.kcal} OBJECTIF · {left >= 0 ? `${Math.round(left)} RESTANTES` : `${Math.round(-left)} EN TROP`}</T>
        <Bar label="KCAL" unit="" value={sum.kcal} max={p.kcal} color={C.gold} />
      </Card>

      <Card>
        <Bar label="PROTEINES" value={sum.p} max={p.protein} color={C.red} />
        <Bar label="GLUCIDES" value={sum.c} max={p.carbs} color={C.orange} />
        <Bar label="LIPIDES" value={sum.f} max={p.fat} color={C.gold} />
      </Card>

      {MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal === meal);
        const kc = list.reduce((a, e) => a + e.kcal, 0);
        return (
          <Card key={meal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T size={16}>{meal}</T>
              <T size={14} color={C.orange}>{Math.round(kc)} KCAL</T>
            </View>
            {list.map((e) => (
              <Pressable key={e.id} onLongPress={async () => { await remove('food_entries', e.id); reload(); }} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size={12} style={{ flex: 1 }}>{e.name} · {Math.round(e.grams)}G</T>
                <T size={12} dim>{Math.round(e.kcal)}</T>
              </Pressable>
            ))}
            {list.length > 0 && <T size={10} dim>APPUI LONG = SUPPRIMER</T>}
            <Btn size="sm" variant="ghost" label="+ AJOUTER" onPress={() => router.push({ pathname: '/add-food', params: { meal, date } })} />
          </Card>
        );
      })}

      <Card>
        <T size={16}>EAU</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Btn size="sm" variant="ghost" label="-" onPress={async () => { await setWater(date, water.glasses - 1); reload(); }} />
          <T size={32} color={C.gold} style={{ flex: 1, textAlign: 'center' }}>{water.glasses} <T size={12} dim>VERRES · {(water.glasses * GLASSES_ML) / 1000}L</T></T>
          <Btn size="sm" variant="gold" label="+ VERRE" onPress={async () => { await setWater(date, water.glasses + 1); reload(); }} />
        </View>
      </Card>
    </Screen>
  );
}
