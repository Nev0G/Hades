import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, Card, Screen, T, Title } from '../../components/ui';
import { MuscleMap } from '../../components/MuscleMap';
import { C } from '../../lib/theme';
import { all, first, remove, save } from '../../lib/db';
import { useLoad } from '../../lib/hooks';

type Row = { id: string; name: string; sets: number; rest_s: number; muscle: string };

export default function DayEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, reload] = useLoad(async () => ({
    day: await first<{ name: string }>('SELECT name FROM program_days WHERE id=?', [id]),
    rows: await all<Row>(
      `SELECT pe.id, e.name, pe.sets, pe.rest_s, e.muscle FROM program_exercises pe JOIN exercises e ON e.id=pe.exercise_id
       WHERE pe.day_id=? AND pe.deleted=0 ORDER BY pe.pos`, [id]),
  }), [id]);

  const patch = async (r: Row, f: Partial<Row>) => {
    const full = await first<Record<string, unknown>>('SELECT * FROM program_exercises WHERE id=?', [r.id]);
    await save('program_exercises', { ...full!, ...f });
    reload();
  };

  return (
    <Screen footer={<><Btn label="+ EXERCICE" onPress={() => router.push({ pathname: '/exercises', params: { pickDay: id } })} /><Btn variant="ghost" label="RETOUR" onPress={() => router.back()} /></>}>
      <Title>{data?.day?.name ?? ''}</Title>
      {data && data.rows.length > 0 && (
        <Card>
          <T size={14} dim>Muscles ciblés</T>
          <MuscleMap
            width={110}
            colors={Object.fromEntries([...new Set(data.rows.map((r) => r.muscle))].map((m) => [m, C.blue]))}
            api={{ muscles: [...new Set(data.rows.map((r) => r.muscle))], color: '#2F7BF6' }}
          />
          <T size={12} dim>{[...new Set(data.rows.map((r) => r.muscle))].join(' · ')}</T>
        </Card>
      )}
      <Btn label="Lancer la séance" onPress={() => router.push({ pathname: '/session/[dayId]', params: { dayId: id } })} />
      {data?.rows.map((r) => (
        <Card key={r.id}>
          <T size={14}>{r.name}</T>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Btn size="sm" variant="ghost" label="-" onPress={() => patch(r, { sets: Math.max(1, r.sets - 1) })} />
            <T size={13}>{r.sets} SERIES</T>
            <Btn size="sm" variant="ghost" label="+" onPress={() => patch(r, { sets: r.sets + 1 })} />
            <View style={{ width: 8 }} />
            <Btn size="sm" variant="ghost" label="-15" onPress={() => patch(r, { rest_s: Math.max(15, r.rest_s - 15) })} />
            <T size={13}>{r.rest_s}S</T>
            <Btn size="sm" variant="ghost" label="+15" onPress={() => patch(r, { rest_s: r.rest_s + 15 })} />
          </View>
          <Btn size="sm" variant="ghost" label="RETIRER" onPress={async () => { await remove('program_exercises', r.id); reload(); }} />
        </Card>
      ))}
    </Screen>
  );
}
