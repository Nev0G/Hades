import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Btn, T } from '../../components/ui';
import { RankBadge } from '../../components/RankBadge';
import { addTo, sanitizeNumber, toNumber } from '../../lib/numpad';
import { all, first, kvGet, remove, save } from '../../lib/db';
import { getProfile, lastSets } from '../../lib/repo';
import { bodyWeight, exerciseStats } from '../../lib/stats';
import { pushStats } from '../../lib/social';
import { effectiveE1rm, rankFor, setXp, standardFor, TIERS, TIER_COLOR } from '../../lib/rank';
import { cancelRestEnd, fmt, initRestNotifications, scheduleRestEnd } from '../../lib/rest';
import { C } from '../../lib/theme';

type SetRow = { weight: string; reps: string; done: boolean; id?: string; prev?: string };
type Item = { exercise_id: string; name: string; muscle: string; equipment: string; compound: number; rest_s: number; rows: SetRow[] };
type Sel = { ei: number; ri: number; field: 'weight' | 'reps' } | null;

export default function RunSession() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<Sel>(null);
  const [inc, setInc] = useState({ a: 2.5, b: 5, r: 1 });
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [startedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [summary, setSummary] = useState<{ xp: number; sets: number; prs: number; min: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null);
  const sessionRef = useRef<string | null>(null);
  const best = useRef<Map<string, { e1rm: number; index: number }>>(new Map());
  const body = useRef({ kg: 75, sex: 'M' as 'M' | 'F' });
  const xp = useRef(0);
  const prs = useRef(0);

  useEffect(() => {
    (async () => {
      const rows = await all<{ id: string; exercise_id: string; name: string; muscle: string; equipment: string; compound: number; sets: number; rest_s: number }>(
        `SELECT pe.id, pe.exercise_id, e.name, e.muscle, e.equipment, e.compound, pe.sets, pe.rest_s FROM program_exercises pe
         JOIN exercises e ON e.id=pe.exercise_id WHERE pe.day_id=? AND pe.deleted=0 ORDER BY pe.pos`, [dayId]);
      const day = await first<{ name: string }>('SELECT name FROM program_days WHERE id=?', [dayId]);
      const built: Item[] = [];
      for (const r of rows) {
        const prev = await lastSets(r.exercise_id);
        const n = Math.max(r.sets, 1);
        built.push({
          ...r,
          rows: Array.from({ length: n }, (_, i) => {
            const p = prev[Math.min(i, prev.length - 1)];
            return { weight: p ? String(p.weight) : '', reps: p ? String(p.reps) : '', done: false, prev: prev[i] ? `${prev[i].weight}kg x ${prev[i].reps}` : '—' };
          }),
        });
      }
      setItems(built);
      if (built.length) setSel({ ei: 0, ri: 0, field: 'weight' });
      const sid = await save('sessions', { day_id: dayId, name: day?.name ?? '', started_at: Date.now(), ended_at: null });
      sessionRef.current = sid;
      body.current = await bodyWeight();
      for (const s of await exerciseStats()) best.current.set(s.id, { e1rm: s.e1rm, index: s.rank.index });
      const p = await getProfile();
      if (p?.keep_awake) activateKeepAwakeAsync('run').catch(() => {});
      setInc({ a: Number((await kvGet('inc_a')) ?? 2.5), b: Number((await kvGet('inc_b')) ?? 5), r: Number((await kvGet('inc_r')) ?? 1) });
      initRestNotifications();
    })();
    return () => {
      try { Promise.resolve(deactivateKeepAwake('run')).catch(() => {}); } catch { /* verrou jamais activé */ }
      cancelRestEnd();
    };
  }, [dayId]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

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

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  const startRest = (s: number, label: string) => { setRestEnd(Date.now() + s * 1000); setLeft(s); scheduleRestEnd(s, label); };
  const addRest = (d: number) => {
    const rem = Math.max(1, Math.ceil(((restEnd ?? Date.now()) + d * 1000 - Date.now()) / 1000));
    setRestEnd(Date.now() + rem * 1000); setLeft(rem); scheduleRestEnd(rem, 'Série suivante');
  };
  const skipRest = () => { setRestEnd(null); cancelRestEnd(); };

  const patch = (ei: number, ri: number, f: Partial<SetRow>) =>
    setItems((it) => it.map((x, i) => (i !== ei ? x : { ...x, rows: x.rows.map((r, j) => (j === ri ? { ...r, ...f } : r)) })));

  const toggle = async (ei: number, ri: number) => {
    const it = items[ei], r = it.rows[ri];
    if (!sessionRef.current) return;
    if (r.done) {
      if (r.id) await remove('sets', r.id);
      patch(ei, ri, { done: false, id: undefined });
      return;
    }
    const w = toNumber(r.weight), reps = toNumber(r.reps);
    if (!reps) { setSel({ ei, ri, field: 'reps' }); return; }
    const id = await save('sets', { session_id: sessionRef.current, exercise_id: it.exercise_id, idx: ri, weight: w, reps, done_at: Date.now() });
    patch(ei, ri, { done: true, id });
    xp.current += setXp(w, reps);

    // Records & rangs
    const std = standardFor(it.name, it.equipment, it.compound === 1);
    const e1 = effectiveE1rm(w, reps, std, body.current.kg);
    const old = best.current.get(it.exercise_id) ?? { e1rm: 0, index: 0 };
    if (e1 > old.e1rm) {
      const rk = rankFor(std, e1, body.current.kg, body.current.sex);
      if (old.e1rm > 0 && rk.index > old.index) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setToast({ text: `RANK UP · ${it.name} → ${TIERS[rk.index]}`, color: TIER_COLOR[rk.tier] });
      } else if (old.e1rm > 0) {
        prs.current += 1;
        setToast({ text: `Nouveau record · 1RM ${e1} kg`, color: C.gold });
      }
      best.current.set(it.exercise_id, { e1rm: e1, index: Math.max(rk.index, old.index) });
    }
    // Sélection suivante + repos
    const nextR = it.rows.findIndex((x, j) => j > ri && !x.done);
    if (nextR >= 0) setSel({ ei, ri: nextR, field: 'weight' });
    else if (ei + 1 < items.length) setSel({ ei: ei + 1, ri: 0, field: 'weight' });
    else setSel(null);
    startRest(it.rest_s, `Prochaine série · ${it.name}`);
  };

  const finish = async () => {
    const id = sessionRef.current;
    const total = items.reduce((a, i) => a + i.rows.filter((r) => r.done).length, 0);
    if (id) {
      const s = await first<Record<string, unknown>>('SELECT * FROM sessions WHERE id=?', [id]);
      if (total === 0) await remove('sessions', id);
      else await save('sessions', { ...s!, ended_at: Date.now() });
    }
    await cancelRestEnd();
    if (total === 0) return router.back();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    getProfile().then((p) => (p?.username ? pushStats(p.username) : null)).catch(() => {}); // classement : silencieux hors-ligne
    setSummary({ xp: xp.current, sets: total, prs: prs.current, min: Math.max(1, Math.round((Date.now() - startedAt) / 60000)) });
  };

  const totalSets = items.reduce((a, i) => a + i.rows.length, 0);
  const doneSets = items.reduce((a, i) => a + i.rows.filter((r) => r.done).length, 0);
  const el = Math.floor((now - startedAt) / 1000);
  const elapsed = `${Math.floor(el / 60)}min ${String(el % 60).padStart(2, '0')}s`;

  if (summary) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, padding: 16, justifyContent: 'center', gap: 16 }}>
        <T size={28} style={{ textAlign: 'center' }}>Séance terminée</T>
        <T size={56} color={C.gold} style={{ textAlign: 'center' }}>+{summary.xp} XP</T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[[summary.sets, 'Séries'], [`${summary.min} min`, 'Durée'], [summary.prs, 'Records']].map(([v, l]) => (
            <View key={String(l)} style={{ alignItems: 'center' }}><T size={22}>{v}</T><T size={12} dim>{l}</T></View>
          ))}
        </View>
        <Btn label="Fermer" onPress={() => router.back()} />
      </View>
    );
  }

  if (restEnd !== null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, padding: 16 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <T size={14} dim>Repos</T>
          <T size={96} color={left <= 5 ? C.red : C.accent}>{fmt(left)}</T>
          <T size={14} dim>{doneSets} / {totalSets} séries</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {[-15, 15, 30].map((d) => <Btn key={d} style={{ flex: 1 }} variant="ghost" label={`${d > 0 ? '+' : ''}${d}`} onPress={() => addRest(d)} />)}
        </View>
        <Btn label="Passer" onPress={skipRest} />
      </View>
    );
  }

  const cur = sel ? items[sel.ei]?.rows[sel.ri] : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
        <T size={18} color={C.accent} style={{ flex: 1 }}>{elapsed}</T>
        <Pressable onPress={() => startRest(90, 'Repos')}><T size={22}>⏱</T></Pressable>
        <Pressable
          onPress={() => { if (confirm) finish(); else { setConfirm(true); setTimeout(() => setConfirm(false), 4000); } }}
          style={{ backgroundColor: confirm ? C.green : C.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }}
        >
          <T size={15} color="#fff">{confirm ? 'Confirmer ?' : 'Terminer'}</T>
        </Pressable>
      </View>
      <View style={{ height: 4, backgroundColor: C.card2 }}>
        <View style={{ height: '100%', width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, backgroundColor: C.accent }} />
      </View>
      {toast && (
        <View style={{ margin: 12, padding: 12, borderRadius: 12, backgroundColor: C.card, borderLeftWidth: 4, borderLeftColor: toast.color }}>
          <T size={15} color={toast.color}>{toast.text}</T>
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {items.length === 0 && <T size={14} dim style={{ padding: 16 }}>Aucun exercice dans ce jour : utilise « Éditer » dans Train.</T>}
        {items.map((it, ei) => {
          const rk = rankFor(standardFor(it.name, it.equipment, it.compound === 1), best.current.get(it.exercise_id)?.e1rm ?? 0, body.current.kg, body.current.sex);
          return (
            <View key={it.exercise_id + ei} style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginBottom: 6 }}>
                <RankBadge tier={rk.tier} size={34} />
                <View style={{ flex: 1 }}>
                  <T size={18} color={C.accent}>{it.name}</T>
                  <T size={12} color={TIER_COLOR[rk.tier]}>{rk.tier}{rk.nextKg ? ` · prochain rang à ${rk.nextKg} kg` : ''}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 6 }}>
                {['SET', 'PREVIOUS', 'KG', 'REPS', '✓'].map((h, i) => (
                  <View key={h} style={{ flex: i === 1 ? 1.6 : 1, alignItems: i === 0 ? 'flex-start' : 'center' }}><T size={12} dim>{h}</T></View>
                ))}
              </View>
              {it.rows.map((r, ri) => (
                <View key={ri} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: r.done ? C.doneBg : ri % 2 ? C.card : C.bg }}>
                  <View style={{ flex: 1 }}><T size={16}>{ri + 1}</T></View>
                  <View style={{ flex: 1.6, alignItems: 'center' }}><T size={14} dim>{r.prev}</T></View>
                  {(['weight', 'reps'] as const).map((f) => {
                    const on = sel?.ei === ei && sel.ri === ri && sel.field === f;
                    return (
                      <View key={f} style={{ flex: 1, alignItems: 'center' }}>
                        <TextInput
                          value={r[f]}
                          onChangeText={(t) => patch(ei, ri, { [f]: sanitizeNumber(t) })}
                          onFocus={() => setSel({ ei, ri, field: f })}
                          keyboardType="decimal-pad"
                          inputMode="decimal"
                          selectTextOnFocus
                          placeholder="–"
                          placeholderTextColor={C.dim}
                          style={{ width: 64, textAlign: 'center', paddingVertical: 6, paddingHorizontal: 0, borderRadius: 10, color: C.text, fontSize: 18, fontWeight: '700', backgroundColor: on ? C.card2 : 'transparent', borderWidth: on ? 2 : 0, borderColor: C.accent }}
                        />
                      </View>
                    );
                  })}
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Pressable onPress={() => toggle(ei, ri)} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: r.done ? C.green : '#6B6B70', alignItems: 'center', justifyContent: 'center' }}>
                      <T size={20} color="#fff">✓</T>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable
                onPress={() => setItems((all) => all.map((x, i) => (i !== ei ? x : { ...x, rows: [...x.rows, { ...(x.rows.at(-1) ?? { weight: '', reps: '' }), done: false, id: undefined, prev: '—' }] })))}
                style={{ marginHorizontal: 14, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: C.card, alignItems: 'center' }}
              >
                <T size={15}>+ Ajouter une série</T>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {sel && (
        <View style={{ padding: 12, paddingBottom: 12 + insets.bottom * 0.5, gap: 8, backgroundColor: C.card }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} size="sm" variant="ghost" label={`+${inc.a} kg`} onPress={() => patch(sel.ei, sel.ri, { weight: addTo(cur?.weight ?? '', inc.a) })} />
            <Btn style={{ flex: 1 }} size="sm" variant="ghost" label={`+${inc.b} kg`} onPress={() => patch(sel.ei, sel.ri, { weight: addTo(cur?.weight ?? '', inc.b) })} />
            <Btn style={{ flex: 1 }} size="sm" variant="ghost" label={`+${inc.r} rep`} onPress={() => patch(sel.ei, sel.ri, { reps: addTo(cur?.reps ?? '', inc.r) })} />
            <Btn style={{ width: 56 }} size="sm" label="OK" onPress={() => { Keyboard.dismiss(); setSel(null); }} />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
