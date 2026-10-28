import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Rect } from 'react-native-svg';
import { Card, Screen, T } from '../../components/ui';
import { RankBadge } from '../../components/RankBadge';
import { MuscleMap } from '../../components/MuscleMap';
import { Ring } from '../../components/Gauge';
import { WireChart } from '../../components/WireChart';
import { Tile } from '../../components/RoutineList';
import { useLoad } from '../../lib/hooks';
import { all, dateKey } from '../../lib/db';
import { entriesFor, getProfile, getWater } from '../../lib/repo';
import { getGoals } from '../../lib/goals';
import { exerciseStats, fmtMin, loadRecovery, muscleRanks, performance, player, sessionsThisWeek, weekActivity, weeklyVolume, weekStreak, Perf } from '../../lib/stats';
import { listRoutines, sortRoutines } from '../../lib/routines';
import { readiness, STATE_COLOR, STATE_LABEL, fmtHours } from '../../lib/recovery';
import { TIER_COLOR } from '../../lib/rank';
import { C } from '../../lib/theme';

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev && !cur) return <T size={12} dim>—</T>;
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : 100;
  const up = pct > 0, flat = pct === 0;
  return <T size={13} color={flat ? C.dim : up ? C.green : C.red}>{flat ? '→' : up ? '↗' : '↘'} {Math.abs(pct)}%</T>;
}

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [d] = useLoad(async () => {
    const ex = await exerciseStats();
    const today = dateKey(new Date());
    const entries = await entriesFor(today);
    return {
      p: await getProfile(), goals: await getGoals(), ex, week: await weekActivity(), lvl: await player(), ranks: muscleRanks(ex),
      cur: await performance(30), prev: await performance(30, 30), rec: await loadRecovery(), routines: await listRoutines(),
      kcal: Math.round(entries.reduce((a, e) => a + e.kcal, 0)), prot: Math.round(entries.reduce((a, e) => a + e.protein, 0)),
      water: (await getWater(today)).glasses, doneWeek: await sessionsThisWeek(), streak: await weekStreak(), vol: await weeklyVolume(8),
      weights: await all<{ weight_kg: number }>('SELECT weight_kg FROM body_weights WHERE deleted=0 ORDER BY date DESC LIMIT 30'),
    };
  });
  if (!d || !d.p) return <Screen><T>...</T></Screen>;

  const next = sortRoutines(d.routines.filter((r) => r.exercises > 0), 'recent')
    .map((r) => ({ r, ready: readiness(r.muscles, d.rec) })).sort((a, b) => b.ready - a.ready)[0];
  const recSorted = [...d.rec].sort((a, b) => a.pct - b.pct);
  const maxVol = Math.max(1, ...d.vol.map((v) => v.volume));
  const cw = width - 64;
  const rows: [string, (p: Perf) => number, (n: number) => string][] = [
    ['Séances', (p) => p.sessions, String], ['Temps total', (p) => p.totalMin, fmtMin], ['Temps moyen', (p) => p.avgMin, fmtMin],
    ['Exercices différents', (p) => p.diffEx, String], ['Volume moyen / séance', (p) => p.avgVolume, (n) => `${n} kg`],
  ];
  const top = [...d.ex].sort((a, b) => b.rank.index + b.rank.progress - (a.rank.index + a.rank.progress)).slice(0, 3);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T size={26}>{d.p.username ? `Salut ${d.p.username}` : 'Dashboard'}</T>
          <T size={13} dim>Niveau {d.lvl.level} · {d.lvl.xp} XP{d.streak > 1 ? ` · 🔥 ${d.streak} semaines de suite` : ''}</T>
        </View>
        <Pressable accessibilityLabel="Mes objectifs" onPress={() => router.push('/goals')} style={{ padding: 8 }}><T size={22}>⚙</T></Pressable>
      </View>
      <View style={{ height: 8, backgroundColor: C.card2, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(d.lvl.progress * 100)}%`, height: '100%', backgroundColor: C.gold }} />
      </View>

      <Card>
        <T size={18}>Aujourd'hui</T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[
            { label: 'Calories', v: d.kcal, max: d.p.kcal, text: `${d.kcal}`, sub: `/ ${d.p.kcal}`, color: C.orange, go: '/(tabs)/food' },
            { label: 'Protéines', v: d.prot, max: d.p.protein, text: `${d.prot}`, sub: `/ ${d.p.protein} g`, color: C.blue, go: '/(tabs)/food' },
            { label: 'Eau', v: d.water, max: d.goals.water, text: `${d.water}`, sub: `/ ${d.goals.water}`, color: '#4FC3F7', go: '/(tabs)/food' },
            { label: 'Séances', v: d.doneWeek, max: d.goals.sessionsPerWeek, text: `${d.doneWeek}`, sub: `/ ${d.goals.sessionsPerWeek} sem.`, color: C.green, go: '/(tabs)/train' },
          ].map((g) => (
            <Pressable key={g.label} onPress={() => router.push(g.go as any)} style={{ alignItems: 'center', gap: 4 }}>
              <Ring value={g.v} max={g.max} size={66} color={g.color}><T size={15}>{g.text}</T></Ring>
              <T size={12} dim>{g.label}</T>
              <T size={11} dim>{g.sub}</T>
            </Pressable>
          ))}
        </View>
      </Card>

      {next && (
        <Pressable onPress={() => router.push({ pathname: '/session/[dayId]', params: { dayId: next.r.id } })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Tile name={next.r.name} />
            <View style={{ flex: 1 }}>
              <T size={12} dim>Séance conseillée</T>
              <T size={18}>{next.r.name}</T>
              <T size={13} color={next.ready >= 70 ? C.green : C.orange}>Muscles prêts à {next.ready} %</T>
            </View>
            <T size={26} color={C.blue}>▶</T>
          </Card>
        </Pressable>
      )}

      <Card>
        <T size={18}>Activité</T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {d.week.map((w, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: w.done ? C.green : C.card2, borderWidth: w.today ? 2 : 0, borderColor: C.blue }}>
                <T size={11} color={w.done ? '#000' : C.dim}>{w.done ? (w.mins ? `${w.mins}m` : '✓') : '✕'}</T>
              </View>
              <T size={12} dim>{w.label}</T>
              <T size={12} color={w.today ? C.text : C.dim}>{String(w.day).padStart(2, '0')}</T>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <T size={18}>Récupération musculaire</T>
        <MuscleMap width={Math.min(300, width - 64)} items={d.rec.map((r) => ({ muscle: r.muscle, color: STATE_COLOR[r.state] }))} />
        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
          {(['fatigue', 'recovering', 'ready'] as const).map((s) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATE_COLOR[s] }} /><T size={11} dim>{STATE_LABEL[s]}</T>
            </View>
          ))}
        </View>
        {recSorted.map((r) => (
          <View key={r.muscle} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={14}>{r.muscle}</T>
              <T size={12} color={STATE_COLOR[r.state]}>{r.lastTrained ? (r.state === 'ready' || r.state === 'rested' ? 'Prêt' : `${STATE_LABEL[r.state]} · ${fmtHours(r.hoursLeft)}`) : 'Frais'}</T>
            </View>
            <View style={{ height: 6, backgroundColor: C.card2, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ width: `${r.pct}%`, height: '100%', backgroundColor: STATE_COLOR[r.state] }} />
            </View>
          </View>
        ))}
        <T size={11} dim>Estimation selon le volume et le délai depuis ta dernière séance, pas une mesure médicale.</T>
      </Card>

      <Card>
        <T size={18}>Volume hebdomadaire</T>
        <Svg width={cw} height={110}>
          {d.vol.map((v, i) => {
            const bw = cw / d.vol.length, h = Math.max(2, (v.volume / maxVol) * 90);
            return <Rect key={i} x={i * bw + 6} y={100 - h} width={bw - 12} height={h} rx={4} fill={i === d.vol.length - 1 ? C.blue : C.card2} />;
          })}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {d.vol.map((v, i) => <T key={i} size={10} dim>{v.label}</T>)}
        </View>
        <T size={12} dim>Cette semaine : {d.vol[d.vol.length - 1].volume} kg · {d.vol[d.vol.length - 1].sessions} séances</T>
      </Card>

      <Card>
        <T size={18}>Performance (30 jours)</T>
        {rows.map(([label, get, fmt]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }}>
            <T size={14} dim style={{ flex: 1 }}>{label}</T>
            <T size={16} style={{ flex: 1 }}>{fmt(get(d.cur))}</T>
            <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
              <Delta cur={get(d.cur)} prev={get(d.prev)} />
              <T size={11} dim>({fmt(get(d.prev))})</T>
            </View>
          </View>
        ))}
      </Card>

      {d.weights.length > 1 && (
        <Card>
          <T size={18}>Poids de corps</T>
          <WireChart data={[...d.weights].reverse().map((w) => w.weight_kg)} width={cw} unit="kg" />
          <T size={12} dim>{d.goals.targetWeight ? `Objectif : ${d.goals.targetWeight} kg` : 'Définis un poids cible dans Mes objectifs'}</T>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RankBadge tier={d.ranks.overall.tier} size={56} />
          <View style={{ flex: 1, gap: 6 }}>
            <T size={12} dim>Rang global</T>
            <T size={22} color={TIER_COLOR[d.ranks.overall.tier]}>{d.ranks.overall.tier}</T>
            <View style={{ height: 8, backgroundColor: C.card2, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(d.ranks.overall.progress * 100)}%`, height: '100%', backgroundColor: TIER_COLOR[d.ranks.overall.tier] }} />
            </View>
          </View>
        </View>
        <MuscleMap width={Math.min(300, width - 64)} items={d.ranks.muscles.map((m) => ({ muscle: m.muscle, color: m.tier ? TIER_COLOR[m.tier] : '#9A9AA0' }))} />
        {top.map((e) => (
          <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <RankBadge tier={e.rank.tier} size={30} />
            <View style={{ flex: 1 }}><T size={14}>{e.name}</T><T size={12} color={TIER_COLOR[e.rank.tier]}>{e.rank.tier} · 1RM {e.e1rm} kg</T></View>
          </View>
        ))}
        <T size={12} color={C.blue} onPress={() => router.push('/(tabs)/stats')}>Voir tous les rangs et statistiques →</T>
      </Card>
    </Screen>
  );
}
