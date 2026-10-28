import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Chips, Screen, T, Title } from '../../components/ui';
import { NumForm } from '../../components/NumForm';
import { kvGet, kvSet, save, all } from '../../lib/db';
import { useLoad } from '../../lib/hooks';
import { getProfile, saveProfile } from '../../lib/repo';
import { Activity, Goal } from '../../lib/nutrition';
import { signOut, getSession, cloudEnabled } from '../../lib/auth';
import { syncNow } from '../../lib/sync';
import { toNumber } from '../../lib/numpad';
import { C } from '../../lib/theme';

const GOALS: Goal[] = ['MASSE', 'SECHE', 'MAINTIEN'];
const ACTS: Activity[] = ['SEDENTAIRE', 'LEGER', 'MODERE', 'INTENSE', 'EXTREME'];

export default function Profile() {
  const router = useRouter();
  const [inc, setInc] = useState<Record<string, string>>({});
  const [info, setInfo] = useState('');
  const [d, reload] = useLoad(async () => {
    const inc0 = { a: (await kvGet('inc_a')) ?? '2.5', b: (await kvGet('inc_b')) ?? '5', r: (await kvGet('inc_r')) ?? '1' };
    setInc(inc0);
    return { p: await getProfile(), s: await getSession(), pending: (await all('SELECT seq FROM outbox')).length };
  });
  const p = d?.p;
  if (!p) return <Screen><T>...</T></Screen>;

  const update = async (patch: Partial<typeof p>) => { await saveProfile({ ...p, ...patch } as any); reload(); };
  const saveInc = async () => {
    await kvSet('inc_a', String(toNumber(inc.a) || 2.5)); await kvSet('inc_b', String(toNumber(inc.b) || 5)); await kvSet('inc_r', String(toNumber(inc.r) || 1));
    setInfo('INCREMENTS ENREGISTRES');
  };

  return (
    <Screen>
      <Title>PROFIL</Title>
      <Card accent={C.gold}>
        <T size={12} dim>{d.s?.email}</T>
        <T size={13}>OBJECTIF {p.kcal} KCAL · TDEE {p.tdee}</T>
        <T size={13}>P {p.protein}G · G {p.carbs}G · L {p.fat}G</T>
      </Card>
      <T size={11} dim>OBJECTIF</T>
      <Chips options={GOALS} value={p.goal} onChange={(g) => update({ goal: g })} color={C.orange} />
      <T size={11} dim>ACTIVITE</T>
      <Chips options={ACTS} value={p.activity} onChange={(a) => update({ activity: a })} color={C.orange} />

      <Card>
        <T size={16}>TOUCHES RAPIDES (RUN SEANCE)</T>
        <NumForm fields={[{ key: 'a', label: 'KG 1', unit: 'KG' }, { key: 'b', label: 'KG 2', unit: 'KG' }, { key: 'r', label: 'REPS', unit: 'REP' }]} values={inc} onChange={setInc} />
        <Btn variant="gold" label="ENREGISTRER" onPress={saveInc} />
      </Card>

      <Card>
        <T size={16}>ECRAN ALLUME PENDANT LA SEANCE</T>
        <Btn variant={p.keep_awake ? 'gold' : 'ghost'} label={p.keep_awake ? 'ACTIVE' : 'DESACTIVE'} onPress={async () => { await save('profile', { ...p, keep_awake: p.keep_awake ? 0 : 1 }); reload(); }} />
      </Card>

      <Card>
        <T size={16}>SYNCHRO</T>
        <T size={12} dim>{cloudEnabled ? `${d.pending} MODIFICATIONS EN ATTENTE` : 'MODE LOCAL (SUPABASE NON CONFIGURE)'}</T>
        {cloudEnabled && <Btn variant="ghost" label="SYNCHRONISER" onPress={async () => { const r = await syncNow(); setInfo(`ENVOYE ${r.sent} · RESTE ${r.pending}`); reload(); }} />}
      </Card>

      <Card>
        <T size={16}>MES DONNEES (RGPD)</T>
        <Btn variant="ghost" label="EXPORTER (JSON)" onPress={async () => {
          const out: Record<string, unknown> = {};
          for (const t of ['profile', 'food_entries', 'water', 'sessions', 'sets', 'body_weights']) out[t] = await all(`SELECT * FROM ${t} WHERE deleted=0`);
          const { Share } = await import('react-native');
          await Share.share({ message: JSON.stringify(out, null, 2) });
        }} />
        <Btn variant="ghost" label="EFFACER MES DONNEES LOCALES" onPress={() => Alert.alert('EFFACER ?', 'IRREVERSIBLE (LOCAL).', [{ text: 'NON' }, { text: 'OUI', style: 'destructive', onPress: async () => {
          for (const t of ['food_entries', 'water', 'sessions', 'sets', 'body_weights', 'photos', 'outbox']) await (await (await import('../../lib/db')).getDb()).runAsync(`DELETE FROM ${t}`);
          setInfo('DONNEES EFFACEES'); reload();
        } }])} />
      </Card>
      {!!info && <T size={12} color={C.gold}>{info}</T>}
      <View style={{ height: 8 }} />
      <Btn variant="ghost" label="DECONNEXION" onPress={async () => { await signOut(); router.replace('/login'); }} />
    </Screen>
  );
}
