import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Field, Screen, T, Title } from '../../components/ui';
import { all, remove, save } from '../../lib/db';
import { useLoad } from '../../lib/hooks';
import { TEMPLATES } from '../../lib/seed';
import { C } from '../../lib/theme';

type Prog = { id: string; name: string };
type Day = { id: string; program_id: string; name: string; pos: number };

export default function Train() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [data, reload] = useLoad(async () => ({
    programs: await all<Prog>('SELECT * FROM programs WHERE deleted=0 ORDER BY updated_at'),
    days: await all<Day>('SELECT * FROM program_days WHERE deleted=0 ORDER BY pos'),
  }));

  const addTemplate = async (tname: string) => {
    const pid = await save('programs', { name: tname });
    let pos = 0;
    for (const [dayName, exNames] of Object.entries(TEMPLATES[tname])) {
      const did = await save('program_days', { program_id: pid, name: dayName, pos: pos++ });
      let ep = 0;
      for (const en of exNames) await save('program_exercises', { day_id: did, exercise_id: `seed-${en}`, pos: ep++, sets: 3, rest_s: 90 });
    }
    reload();
  };
  const addBlank = async () => {
    if (!name) return;
    const pid = await save('programs', { name: name.toUpperCase() });
    await save('program_days', { program_id: pid, name: 'JOUR 1', pos: 0 });
    setName('');
    reload();
  };

  return (
    <Screen footer={<Btn variant="gold" label="BIBLIOTHEQUE D'EXERCICES" onPress={() => router.push('/exercises')} />}>
      <Title>PROGRAMMES</Title>
      {data?.programs.length === 0 && <T size={12} dim>AUCUN PROGRAMME. CHARGE UN MODELE OU CREE LE TIEN.</T>}
      {data?.programs.map((p) => (
        <Card key={p.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={18} color={C.orange}>{p.name}</T>
            <T size={11} color={C.red} onPress={async () => { await remove('programs', p.id); reload(); }}>SUPPR.</T>
          </View>
          {data.days.filter((d) => d.program_id === p.id).map((d) => (
            <View key={d.id} style={{ flexDirection: 'row', gap: 8 }}>
              <Btn style={{ flex: 1 }} label={`RUN ${d.name}`} onPress={() => router.push({ pathname: '/session/[dayId]', params: { dayId: d.id } })} />
              <Btn variant="ghost" label="EDIT" onPress={() => router.push({ pathname: '/day/[id]', params: { id: d.id } })} />
            </View>
          ))}
          <Btn size="sm" variant="ghost" label="+ JOUR" onPress={async () => {
            const n = data.days.filter((d) => d.program_id === p.id).length;
            await save('program_days', { program_id: p.id, name: `JOUR ${n + 1}`, pos: n });
            reload();
          }} />
        </Card>
      ))}
      <T size={14}>MODELES</T>
      {Object.keys(TEMPLATES).map((t) => (<Btn key={t} variant="ghost" label={`+ ${t}`} onPress={() => addTemplate(t)} />))}
      <Field label="PROGRAMME PERSO" value={name} onChangeText={setName} placeholder="NOM" />
      <Btn variant="orange" label="CREER" disabled={!name} onPress={addBlank} />
    </Screen>
  );
}
