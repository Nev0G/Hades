import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Chips, Field, Screen, T, Title } from '../components/ui';
import { all, save } from '../lib/db';
import { useLoad } from '../lib/hooks';
import { Exercise, listExercises } from '../lib/repo';
import { EQUIPMENTS, MUSCLES } from '../lib/seed';
import { C } from '../lib/theme';

/** Bibliothèque : filtre muscle/équipement, création perso. Avec ?pickDay=<id> : ajoute l'exercice au jour. */
export default function Exercises() {
  const router = useRouter();
  const { pickDay } = useLocalSearchParams<{ pickDay?: string }>();
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nm, setNm] = useState<(typeof MUSCLES)[number]>('PECTORAUX');
  const [ne, setNe] = useState<(typeof EQUIPMENTS)[number]>('BARRE');
  const [list, reload] = useLoad(listExercises);

  const shown = (list ?? []).filter((e) => (!muscle || e.muscle === muscle) && (!equip || e.equipment === equip));

  const pick = async (e: Exercise) => {
    if (!pickDay) return;
    const n = (await all<{ id: string }>('SELECT id FROM program_exercises WHERE day_id=? AND deleted=0', [pickDay])).length;
    await save('program_exercises', { day_id: pickDay, exercise_id: e.id, pos: n, sets: 3, rest_s: 90 });
    router.back();
  };

  if (creating) {
    return (
      <Screen footer={<><Btn label="ENREGISTRER" disabled={!name} onPress={async () => {
        await save('exercises', { name: name.toUpperCase(), muscle: nm, equipment: ne, compound: 0, custom: 1 });
        setName(''); setCreating(false); reload();
      }} /><Btn variant="ghost" label="ANNULER" onPress={() => setCreating(false)} /></>}>
        <Title>NOUVEL EXERCICE</Title>
        <Field label="NOM" value={name} onChangeText={setName} />
        <T size={11} dim>MUSCLE</T><Chips options={MUSCLES} value={nm} onChange={setNm} />
        <T size={11} dim>EQUIPEMENT</T><Chips options={EQUIPMENTS} value={ne} onChange={setNe} color={C.orange} />
      </Screen>
    );
  }
  return (
    <Screen footer={<><Btn variant="orange" label="+ EXERCICE PERSO" onPress={() => setCreating(true)} /><Btn variant="ghost" label="RETOUR" onPress={() => router.back()} /></>}>
      <Title>{pickDay ? 'CHOISIR UN EXERCICE' : 'EXERCICES'}</Title>
      <T size={11} dim>MUSCLE (RETOUCHER = TOUS)</T>
      <Chips options={MUSCLES} value={muscle as any} onChange={(m) => setMuscle(m === muscle ? null : m)} />
      <T size={11} dim>EQUIPEMENT</T>
      <Chips options={EQUIPMENTS} value={equip as any} onChange={(m) => setEquip(m === equip ? null : m)} color={C.orange} />
      <View style={{ gap: 8 }}>
        {shown.map((e) => (
          <Card key={e.id} style={{ padding: 10 }}>
            <T size={14} onPress={() => pick(e)}>{e.name}</T>
            <T size={10} dim>{e.muscle} · {e.equipment}{e.custom ? ' · PERSO' : ''}{e.compound ? ' · POLY' : ''}</T>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
