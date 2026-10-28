import React from 'react';
import { View } from 'react-native';
import { Card, Screen, T } from '../../components/ui';
import { RankBadge } from '../../components/RankBadge';
import { BodyRanks } from '../../components/BodyRanks';
import { useLoad } from '../../lib/hooks';
import { exerciseStats, fmtMin, muscleRanks, performance, player, weekActivity, Perf } from '../../lib/stats';
import { TIER_COLOR } from '../../lib/rank';
import { C } from '../../lib/theme';

function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev && !cur) return <T size={12} dim>—</T>;
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : 100;
  const up = pct > 0, flat = pct === 0;
  const good = flat ? null : invert ? !up : up;
  return <T size={13} color={good === null ? C.dim : good ? C.green : C.red}>{flat ? '→' : up ? '↗' : '↘'} {Math.abs(pct)}%</T>;
}

export default function Dashboard() {
  const [d] = useLoad(async () => {
    const ex = await exerciseStats();
    return {
      ex, week: await weekActivity(), lvl: await player(), muscles: muscleRanks(ex),
      cur: await performance(30), prev: await performance(30, 30),
    };
  });
  if (!d) return <Screen><T>...</T></Screen>;
  const top = [...d.ex].sort((a, b) => b.rank.index + b.rank.progress - (a.rank.index + a.rank.progress)).slice(0, 5);
  const rows: [string, (p: Perf) => number, (n: number) => string][] = [
    ['Séances', (p) => p.sessions, String],
    ['Temps total', (p) => p.totalMin, fmtMin],
    ['Temps moyen', (p) => p.avgMin, fmtMin],
    ['Exercices différents', (p) => p.diffEx, String],
    ['Exo / séance', (p) => p.exPerSession, String],
    ['Volume moyen / séance', (p) => p.avgVolume, (n) => `${n} kg`],
  ];

  return (
    <Screen>
      <T size={26}>Dashboard</T>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }}>
            <T size={11} color="#fff">NIV</T>
            <T size={24} color="#fff">{d.lvl.level}</T>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <T size={16}>Niveau {d.lvl.level}</T>
            <View style={{ height: 10, backgroundColor: C.card2, borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(d.lvl.progress * 100)}%`, height: '100%', backgroundColor: C.gold, borderRadius: 6 }} />
            </View>
            <T size={12} dim>{d.lvl.xp} / {d.lvl.next} XP</T>
          </View>
        </View>
      </Card>

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

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RankBadge tier={d.muscles.overall.tier} size={64} />
          <View style={{ flex: 1, gap: 6 }}>
            <T size={12} dim>Rang global</T>
            <T size={22} color={TIER_COLOR[d.muscles.overall.tier]}>{d.muscles.overall.tier}</T>
            <View style={{ height: 8, backgroundColor: C.card2, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(d.muscles.overall.progress * 100)}%`, height: '100%', backgroundColor: TIER_COLOR[d.muscles.overall.tier] }} />
            </View>
          </View>
        </View>
        <BodyRanks muscles={d.muscles.muscles} width={140} />
      </Card>

      <Card>
        <T size={18}>Rang par muscle</T>
        {d.muscles.muscles.map((m) => (
          <View key={m.muscle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
            {m.tier ? <RankBadge tier={m.tier} size={34} /> : <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.card2 }} />}
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size={14}>{m.muscle}</T>
                <T size={13} color={m.tier ? TIER_COLOR[m.tier] : C.dim}>{m.tier ?? 'Non classé'}</T>
              </View>
              <View style={{ height: 6, backgroundColor: C.card2, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(m.progress * 100)}%`, height: '100%', backgroundColor: m.tier ? TIER_COLOR[m.tier] : C.card2 }} />
              </View>
            </View>
          </View>
        ))}
      </Card>

      {top.length > 0 && (
        <Card>
          <T size={18}>Meilleurs rangs</T>
          {top.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <RankBadge tier={e.rank.tier} size={36} />
              <View style={{ flex: 1 }}>
                <T size={14}>{e.name}</T>
                <T size={12} color={TIER_COLOR[e.rank.tier]}>{e.rank.tier} · 1RM {e.e1rm} kg</T>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
