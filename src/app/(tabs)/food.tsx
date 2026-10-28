import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput } from 'react-native';
import { Bar, Btn, Card, Screen, T } from '../../components/ui';
import { saveTemplate } from '../../lib/meals';
import { Gauge, Ring } from '../../components/Gauge';
import { all, dateKey, remove } from '../../lib/db';
import { useLoad } from '../../lib/hooks';
import { entriesFor, getProfile, getWater, Meal, MEALS, setWater } from '../../lib/repo';
import { C, GLASSES_ML } from '../../lib/theme';

const SHARE: Record<Meal, number> = { 'PETIT-DEJEUNER': 0.25, DEJEUNER: 0.35, DINER: 0.3, COLLATIONS: 0.1 };
const LABEL: Record<Meal, string> = { 'PETIT-DEJEUNER': 'Petit-déjeuner', DEJEUNER: 'Déjeuner', DINER: 'Dîner', COLLATIONS: 'Collations' };
const ICON: Record<Meal, string> = { 'PETIT-DEJEUNER': '☕', DEJEUNER: '🥗', DINER: '🍽', COLLATIONS: '🍎' };
const KCAL_PER_MIN = 6; // estimation grossière d'une séance de musculation

export default function Journal() {
  const router = useRouter();
  const [date, setDate] = useState(dateKey(new Date()));
  const [open, setOpen] = useState<Meal | null>(null);
  const [saving, setSaving] = useState<Meal | null>(null);
  const [tname, setTname] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [data, reload] = useLoad(async () => {
    const sess = await all<{ started_at: number; ended_at: number }>('SELECT started_at,ended_at FROM sessions WHERE deleted=0 AND ended_at IS NOT NULL');
    const burnedMin = sess.filter((s) => dateKey(new Date(s.started_at)) === date).reduce((a, s) => a + (s.ended_at - s.started_at) / 60000, 0);
    return { profile: await getProfile(), entries: await entriesFor(date), water: await getWater(date), burned: Math.round(burnedMin * KCAL_PER_MIN) };
  }, [date]);

  const shift = (d: number) => {
    const [y, m, day] = date.split('-').map(Number);
    setDate(dateKey(new Date(y, m - 1, day + d)));
  };
  if (!data || !data.profile) return <Screen><T>...</T></Screen>;
  const { profile: p, entries, water, burned } = data;
  const sum = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.protein, c: a.c + e.carbs, f: a.f + e.fat }), { kcal: 0, p: 0, c: 0, f: 0 });
  const remaining = Math.round(p.kcal + burned - sum.kcal);
  const isToday = date === dateKey(new Date());

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <T size={30}>{isToday ? "Aujourd'hui" : date}</T>
          <T size={13} dim>{date}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn size="sm" variant="ghost" label="<" onPress={() => shift(-1)} />
          <Btn size="sm" variant="ghost" label=">" onPress={() => shift(1)} />
        </View>
      </View>

      <T size={20}>Résumé</T>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', width: 76 }}>
            <T size={20}>{Math.round(sum.kcal)}</T>
            <T size={12} dim>Mangé</T>
          </View>
          <Gauge value={sum.kcal - burned} max={p.kcal} size={170} color={remaining < 0 ? C.red : C.green} center={String(remaining)} label={remaining < 0 ? 'Dépassé' : 'Restant'} />
          <View style={{ alignItems: 'center', width: 76 }}>
            <T size={20}>{burned}</T>
            <T size={12} dim>Brûlé ~</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[['Glucides', sum.c, p.carbs, C.orange], ['Protéines', sum.p, p.protein, C.accent], ['Lipides', sum.f, p.fat, C.gold]].map(([l, v, m, c]) => (
            <View key={String(l)} style={{ flex: 1 }}>
              <Bar stacked label={String(l)} value={Number(v)} max={Number(m)} color={String(c)} unit="g" />
            </View>
          ))}
        </View>
      </Card>

      <T size={20}>Nutrition</T>
      <View style={{ gap: 10 }}>
        {MEALS.map((meal) => {
          const list = entries.filter((e) => e.meal === meal);
          const kc = Math.round(list.reduce((a, e) => a + e.kcal, 0));
          const target = Math.round(p.kcal * SHARE[meal]);
          const expanded = open === meal;
          return (
            <Card key={meal} style={{ padding: 12 }}>
              <Pressable onPress={() => setOpen(expanded ? null : meal)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ring value={kc} max={target}><T size={20}>{ICON[meal]}</T></Ring>
                <View style={{ flex: 1 }}>
                  <T size={17}>{LABEL[meal]}</T>
                  <T size={13} dim>{kc} / {target} kcal</T>
                  <T size={12} dim>{list.length ? list.map((e) => e.name).join(', ').slice(0, 42) : 'Rien de noté'}</T>
                </View>
                <Pressable onPress={() => router.push({ pathname: '/add-food', params: { meal, date } })}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <T size={26} color="#fff">+</T>
                </Pressable>
              </Pressable>
              {expanded && list.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line }}>
                  <View style={{ flex: 1 }}>
                    <T size={14}>{e.name}</T>
                    <T size={12} dim>{Math.round(e.grams)} g · P {Math.round(e.protein)} · G {Math.round(e.carbs)} · L {Math.round(e.fat)}</T>
                  </View>
                  <T size={14}>{Math.round(e.kcal)}</T>
                  <T size={13} color={C.red} style={{ marginLeft: 14 }} onPress={async () => { await remove('food_entries', e.id); reload(); }}>Suppr.</T>
                </View>
              ))}
              {expanded && list.length > 0 && (saving === meal ? (
                <View style={{ gap: 8 }}>
                  <TextInput value={tname} onChangeText={setTname} autoFocus placeholder="Nom du repas" placeholderTextColor={C.dim} style={{ backgroundColor: C.card2, color: C.text, borderRadius: 10, padding: 12, fontSize: 16 }} />
                  <Btn size="sm" label="Enregistrer le repas" disabled={!tname.trim()} onPress={async () => {
                    await saveTemplate({ name: tname, kind: 'meal', portions: 1, items: list.map((e) => ({ name: e.name, grams: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat })) });
                    setSaving(null); setTname(''); setSavedMsg(`« ${tname.trim()} » enregistré : retrouve-le dans Ajouter > Repas`);
                  }} />
                </View>
              ) : (
                <Btn size="sm" variant="ghost" label="Enregistrer comme repas" onPress={() => { setSaving(meal); setTname(LABEL[meal]); }} />
              ))}
            </Card>
          );
        })}
      </View>
      {savedMsg ? <T size={13} color={C.green}>{savedMsg}</T> : null}

      <Card>
        <T size={18}>Eau</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Btn size="sm" variant="ghost" label="-" onPress={async () => { await setWater(date, water.glasses - 1); reload(); }} />
          <T size={30} color={C.accent} style={{ flex: 1, textAlign: 'center' }}>{water.glasses} <T size={12} dim>verres · {(water.glasses * GLASSES_ML) / 1000} L</T></T>
          <Btn size="sm" label="+ Verre" onPress={async () => { await setWater(date, water.glasses + 1); reload(); }} />
        </View>
      </Card>
    </Screen>
  );
}
