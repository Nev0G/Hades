import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Vibration, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Btn, Card, Screen, T } from '../../components/ui';
import { NumPad } from '../../components/NumPad';
import { addTo, toNumber } from '../../lib/numpad';
import { all, first, kvGet, remove, save } from '../../lib/db';
import { getProfile, lastSets, SetRow } from '../../lib/repo';
import { estimate1RM } from '../../lib/strength';
import { cancelRestEnd, fmt, initRestNotifications, scheduleRestEnd } from '../../lib/rest';
import { C, inset, raised } from '../../lib/theme';

type Item = { id: string; exercise_id: string; name: string; sets: number; rest_s: number; compound: number };

export default function RunSession() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cur, setCur] = useState(0);
  const [done, setDone] = useState<SetRow[]>([]);
  const [prev, setPrev] = useState<SetRow[]>([]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [field, setField] = useState<'weight' | 'reps'>('weight');
  const [inc, setInc] = useState({ a: 2.5, b: 5, r: 1 });
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const sessionRef = useRef<string | null>(null);

  // Init : crée la séance, charge les exercices, garde l'écran allumé si activé.
  useEffect(() => {
    (async () => {
      const rows = await all<Item>(
        `SELECT pe.id, pe.exercise_id, e.name, pe.sets, pe.rest_s, e.compound FROM program_exercises pe JOIN exercises e ON e.id=pe.exercise_id
         WHERE pe.day_id=? AND pe.deleted=0 ORDER BY pe.pos`, [dayId]);
      const day = await first<{ name: string }>('SELECT name FROM program_days WHERE id=?', [dayId]);
      setItems(rows);
      const sid = await save('sessions', { day_id: dayId, name: day?.name ?? '', started_at: Date.now(), ended_at: null });
      sessionRef.current = sid;
      setSessionId(sid);
      const p = await getProfile();
      if (p?.keep_awake) activateKeepAwakeAsync('run').catch(() => {});
      setInc({ a: Number((await kvGet('inc_a')) ?? 2.5), b: Number((await kvGet('inc_b')) ?? 5), r: Number((await kvGet('inc_r')) ?? 1) });
      initRestNotifications();
    })();
    return () => { deactivateKeepAwake('run'); cancelRestEnd(); };
  }, [dayId]);

  const item = items[cur];
  const mine = done.filter((s) => s.exercise_id === item?.exercise_id);

  // Surcharge progressive : reprend la série correspondante de la dernière séance.
  useEffect(() => {
    if (!item || !sessionId) return;
    lastSets(item.exercise_id, sessionId).then((p) => {
      setPrev(p);
      const ref = p.length ? p[Math.min(mine.length, p.length - 1)] : mine[mine.length - 1];
      if (ref) { setWeight(String(ref.weight)); setReps(String(ref.reps)); }
      else { setWeight(''); setReps(''); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.exercise_id, sessionId, mine.length]);

  // Décompte du repos.
  useEffect(() => {
    if (restEnd === null) return;
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        Vibration.vibrate([0, 400, 150, 400, 150, 400]);
        setRestEnd(null);
      }
    }, 200);
    return () => clearInterval(t);
  }, [restEnd]);

  const startRest = (s: number) => {
    setRestEnd(Date.now() + s * 1000);
    setLeft(s);
    scheduleRestEnd(s, item ? `SUIVANT : ${item.name}` : 'SERIE SUIVANTE');
  };
  const addRest = (d: number) => {
    const end = (restEnd ?? Date.now()) + d * 1000;
    const rem = Math.max(1, Math.ceil((end - Date.now()) / 1000));
    setRestEnd(Date.now() + rem * 1000);
    setLeft(rem);
    scheduleRestEnd(rem, 'SERIE SUIVANTE');
  };
  const skipRest = () => { setRestEnd(null); cancelRestEnd(); };

  const validate = async () => {
    if (!item || !sessionId || !toNumber(reps)) return;
    const row = { session_id: sessionId, exercise_id: item.exercise_id, idx: mine.length, weight: toNumber(weight), reps: toNumber(reps), done_at: Date.now() };
    const id = await save('sets', row);
    setDone([...done, { id, ...row }]);
    startRest(item.rest_s);
  };

  const finish = async () => {
    const id = sessionRef.current;
    if (id) {
      const s = await first<Record<string, unknown>>('SELECT * FROM sessions WHERE id=?', [id]);
      if (done.length === 0) await remove('sessions', id);
      else await save('sessions', { ...s!, ended_at: Date.now() });
    }
    await cancelRestEnd();
    router.back();
  };

  if (!item) return <Screen><T>CHARGEMENT / AUCUN EXERCICE (UTILISE EDIT)</T><Btn variant="ghost" label="RETOUR" onPress={() => router.back()} /></Screen>;

  if (restEnd !== null) {
    return (
      <Screen scroll={false} footer={<>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn style={{ flex: 1 }} variant="ghost" label="-15" onPress={() => addRest(-15)} />
          <Btn style={{ flex: 1 }} variant="ghost" label="+15" onPress={() => addRest(15)} />
          <Btn style={{ flex: 1 }} variant="ghost" label="+30" onPress={() => addRest(30)} />
        </View>
        <Btn label="PASSER" onPress={skipRest} />
      </>}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <T size={14} dim>REPOS</T>
          <T size={110} color={left <= 5 ? C.red : C.gold}>{fmt(left)}</T>
          <T size={14}>PROCHAINE : {item.name} · SERIE {mine.length + 1}/{item.sets}</T>
        </View>
      </Screen>
    );
  }

  const target = field === 'weight' ? weight : reps;
  const setTarget = field === 'weight' ? setWeight : setReps;

  return (
    <Screen
      scroll={false}
      footer={<>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Btn style={{ flex: 1 }} size="sm" variant="gold" label={`+${inc.a}KG`} onPress={() => setWeight(addTo(weight, inc.a))} />
          <Btn style={{ flex: 1 }} size="sm" variant="gold" label={`+${inc.b}KG`} onPress={() => setWeight(addTo(weight, inc.b))} />
          <Btn style={{ flex: 1 }} size="sm" variant="orange" label={`+${inc.r} REP`} onPress={() => setReps(addTo(reps, inc.r))} />
        </View>
        <NumPad value={target} onChange={setTarget} />
        <Btn label={`VALIDER SERIE ${mine.length + 1}`} disabled={!toNumber(reps)} onPress={validate} />
      </>}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T size={11} dim>EXO {cur + 1}/{items.length} · SERIE {mine.length + 1}/{item.sets}</T>
        <T size={11} color={C.red} onPress={() => Alert.alert('TERMINER ?', '', [{ text: 'NON' }, { text: 'OUI', onPress: finish }])}>TERMINER</T>
      </View>
      <T size={34} style={{ letterSpacing: 1 }}>{item.name}</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['weight', 'reps'] as const).map((f) => (
          <Pressable key={f} onPress={() => setField(f)} style={[{ flex: 1, padding: 14 }, field === f ? inset(5, 20) : raised(6, 20)]}>
            <T size={11} dim>{f === 'weight' ? 'KG' : 'REPS'}</T>
            <T size={48} color={field === f ? C.gold : C.text}>{(f === 'weight' ? weight : reps) || '0'}</T>
          </Pressable>
        ))}
      </View>
      <Card style={{ padding: 10 }}>
        <T size={11} dim>SEANCE PRECEDENTE</T>
        <T size={13}>{prev.length ? prev.map((s) => `${s.weight}x${s.reps}`).join('  ') : 'PREMIERE FOIS'}</T>
        <T size={11} dim>AUJOURD'HUI</T>
        <T size={13} color={C.orange}>{mine.length ? mine.map((s) => `${s.weight}x${s.reps}`).join('  ') : '—'}</T>
        {toNumber(weight) > 0 && toNumber(reps) > 0 && <T size={11} dim>1RM EST. {estimate1RM(toNumber(weight), toNumber(reps))} KG</T>}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn size="sm" variant="ghost" style={{ flex: 1 }} label="< EXO" disabled={cur === 0} onPress={() => setCur(cur - 1)} />
        <Btn size="sm" variant="ghost" style={{ flex: 1 }} label={cur === items.length - 1 ? 'FIN' : 'EXO >'} onPress={() => (cur === items.length - 1 ? finish() : setCur(cur + 1))} />
      </View>
    </Screen>
  );
}
