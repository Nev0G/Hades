import React, { useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Btn, Card, Chips, Screen, T, Title } from '../../components/ui';
import { NumPad } from '../../components/NumPad';
import { WireChart } from '../../components/WireChart';
import { all, first, save, today } from '../../lib/db';
import { useLoad } from '../../lib/hooks';
import { logWeight } from '../../lib/repo';
import { best1RM } from '../../lib/strength';
import { toNumber } from '../../lib/numpad';
import { C } from '../../lib/theme';

type Ex = { id: string; name: string };
type Photo = { id: string; date: string; uri: string; weight_kg: number };

export default function Stats() {
  const { width } = useWindowDimensions();
  const [exId, setExId] = useState<string | null>(null);
  const [kg, setKg] = useState('');
  const [cmp, setCmp] = useState<string[]>([]);

  const [d, reload] = useLoad(async () => {
    const weights = await all<{ date: string; weight_kg: number }>('SELECT date,weight_kg FROM body_weights WHERE deleted=0 ORDER BY date');
    const exs = await all<Ex>(`SELECT DISTINCT e.id,e.name FROM sets s JOIN exercises e ON e.id=s.exercise_id WHERE s.deleted=0 ORDER BY e.name`);
    const photos = await all<Photo>('SELECT * FROM photos WHERE deleted=0 ORDER BY date DESC, updated_at DESC');
    const sel = exId ?? exs[0]?.id ?? null;
    const per = sel
      ? await all<{ session_id: string; weight: number; reps: number; done_at: number }>('SELECT session_id,weight,reps,done_at FROM sets WHERE exercise_id=? AND deleted=0 ORDER BY done_at', [sel])
      : [];
    const bySession = new Map<string, { weight: number; reps: number }[]>();
    for (const s of per) bySession.set(s.session_id, [...(bySession.get(s.session_id) ?? []), s]);
    const loads = [...bySession.values()].map((v) => Math.max(...v.map((x) => x.weight)));
    const rm = [...bySession.values()].map((v) => best1RM(v));
    const compound = sel ? (await first<{ compound: number }>('SELECT compound FROM exercises WHERE id=?', [sel]))?.compound === 1 : false;
    return { weights, exs, photos, sel, loads, rm, compound };
  }, [exId]);

  const addPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const r = perm.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (r.canceled) return;
    const w = (await first<{ weight_kg: number }>('SELECT weight_kg FROM body_weights WHERE deleted=0 ORDER BY date DESC LIMIT 1'))?.weight_kg ?? 0;
    await save('photos', { date: today(), uri: r.assets[0].uri, weight_kg: w });
    reload();
  };

  const cw = width - 64;
  const toggle = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));
  const pair = (d?.photos ?? []).filter((p) => cmp.includes(p.id));

  return (
    <Screen>
      <Title>STATS</Title>
      <Card>
        <T size={16}>POIDS DE CORPS</T>
        <WireChart data={(d?.weights ?? []).map((w) => w.weight_kg)} width={cw} unit="KG" />
        <T size={32} color={C.gold}>{kg || (d?.weights.at(-1)?.weight_kg ?? 0)} <T size={12} dim>KG</T></T>
        <NumPad value={kg} onChange={setKg} />
        <Btn variant="gold" label="ENREGISTRER LE POIDS" disabled={!toNumber(kg)} onPress={async () => { await logWeight(toNumber(kg)); setKg(''); reload(); }} />
      </Card>

      <Card>
        <T size={16}>CHARGES / 1RM</T>
        {d?.exs.length ? (
          <>
            <Chips options={d.exs.map((e) => e.name)} value={d.exs.find((e) => e.id === d.sel)?.name ?? null} onChange={(n) => setExId(d.exs.find((e) => e.name === n)!.id)} color={C.orange} />
            <T size={11} dim>CHARGE MAX PAR SEANCE</T>
            <WireChart data={d.loads} width={cw} unit="KG" color={C.red} />
            <T size={11} dim>1RM ESTIME {d.compound ? '(POLYARTICULAIRE)' : ''}</T>
            <WireChart data={d.rm} width={cw} unit="KG" color={C.gold} />
            <T size={28} color={C.gold}>{d.rm.at(-1) ?? 0} KG</T>
          </>
        ) : <T size={12} dim>FAIS UNE SEANCE POUR VOIR TES COURBES.</T>}
      </Card>

      <Card>
        <T size={16}>PHOTOS AVANT / APRES</T>
        <Btn variant="orange" label="+ PHOTO" onPress={addPhoto} />
        {pair.length === 2 && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[...pair].sort((a, b) => a.date.localeCompare(b.date)).map((p, i) => (
              <View key={p.id} style={{ flex: 1 }}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} />
                <T size={10} color={C.gold} style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: '#000' }}>{i === 0 ? 'AVANT' : 'APRES'} {p.date} {p.weight_kg}KG</T>
              </View>
            ))}
          </View>
        )}
        <T size={10} dim>TOUCHE 2 PHOTOS POUR COMPARER</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {d?.photos.map((p) => (
            <View key={p.id} style={{ width: '32.5%', borderWidth: 3, borderColor: cmp.includes(p.id) ? C.gold : C.line }}>
              <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} onTouchEnd={() => toggle(p.id)} />
              <T size={9} color={C.gold} style={{ position: 'absolute', bottom: 2, left: 2, backgroundColor: '#000' }}>{p.date} {p.weight_kg}KG</T>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
