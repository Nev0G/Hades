import React, { useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Btn, Card, Screen, T, Title } from '../../components/ui';
import { RankBadge } from '../../components/RankBadge';
import { exerciseStats } from '../../lib/stats';
import { TIER_COLOR } from '../../lib/rank';
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
    const ex = (await exerciseStats()).sort((a, b) => b.e1rm - a.e1rm);
    const exs = ex;
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
    return { weights, ex, photos, sel, loads, rm, compound };
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
      <Title>Statistiques</Title>
      <Card>
        <T size={18}>Poids de corps</T>
        <WireChart data={(d?.weights ?? []).map((w) => w.weight_kg)} width={cw} unit="KG" />
        <T size={32} color={C.gold}>{kg || (d?.weights.at(-1)?.weight_kg ?? 0)} <T size={12} dim>KG</T></T>
        <NumPad value={kg} onChange={setKg} />
        <Btn variant="gold" label="ENREGISTRER LE POIDS" disabled={!toNumber(kg)} onPress={async () => { await logWeight(toNumber(kg)); setKg(''); reload(); }} />
      </Card>

      <T size={18}>Exercices</T>
      {d?.ex.length === 0 && <Card><T size={13} dim>Fais une séance pour voir tes courbes et tes rangs.</T></Card>}
      {d?.ex.map((e) => {
        const open = e.id === d.sel;
        const pct = Math.round(e.rank.progress * 100);
        return (
          <Pressable key={e.id} onPress={() => setExId(e.id)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <RankBadge tier={e.rank.tier} size={40} />
                <View style={{ flex: 1 }}>
                  <T size={16}>{e.name}</T>
                  <T size={12} color={TIER_COLOR[e.rank.tier]}>{e.rank.tier} · 1RM {e.e1rm} kg</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {[[e.sessions, 'Séances'], [e.sets, 'Séries'], [`${e.maxWeight} kg`, 'Max'], [`${Math.round(e.volume / 100) / 10} t`, 'Total']].map(([v, l]) => (
                  <View key={String(l)} style={{ alignItems: 'center' }}><T size={15}>{v}</T><T size={11} dim>{l}</T></View>
                ))}
              </View>
              <View style={{ height: 8, backgroundColor: C.card2, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: TIER_COLOR[e.rank.tier] }} />
              </View>
              <T size={12} dim>{e.rank.nextKg ? `${pct}% vers le rang suivant (${e.rank.nextKg} kg de 1RM)` : 'Rang maximum atteint'}</T>
              {open && (
                <>
                  <T size={14}>Progression de la charge max</T>
                  <WireChart data={d.loads} width={cw - 16} unit="kg" />
                  <T size={14}>1RM estimé</T>
                  <WireChart data={d.rm} width={cw - 16} unit="kg" color={C.gold} />
                </>
              )}
            </Card>
          </Pressable>
        );
      })}

      <Card>
        <T size={18}>Photos avant / après</T>
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
            <View key={p.id} style={{ width: '32%', borderRadius: 12, overflow: 'hidden', borderWidth: cmp.includes(p.id) ? 3 : 0, borderColor: C.gold }}>
              <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} onTouchEnd={() => toggle(p.id)} />
              <T size={9} color={C.gold} style={{ position: 'absolute', bottom: 2, left: 2, backgroundColor: '#000' }}>{p.date} {p.weight_kg}KG</T>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
