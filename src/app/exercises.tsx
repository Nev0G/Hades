import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chips, Field, Screen, T, Title } from '../components/ui';
import { all, save } from '../lib/db';
import { useLoad } from '../lib/hooks';
import { Exercise, listExercises } from '../lib/repo';
import { EQUIPMENTS, MUSCLES } from '../lib/seed';
import { importWger } from '../lib/wger';
import { C } from '../lib/theme';

/** Bibliothèque : recherche + filtres, import wger, création perso. Avec ?pickDay=<id> : ajoute l'exercice au jour. */
export default function Exercises() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pickDay } = useLocalSearchParams<{ pickDay?: string }>();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nm, setNm] = useState<(typeof MUSCLES)[number]>('PECTORAUX');
  const [ne, setNe] = useState<(typeof EQUIPMENTS)[number]>('BARRE');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, reload] = useLoad(listExercises);

  const shown = useMemo(() => {
    const n = q.trim().toUpperCase();
    return (list ?? []).filter((e) => (!muscle || e.muscle === muscle) && (!equip || e.equipment === equip) && (!n || e.name.includes(n)));
  }, [list, q, muscle, equip]);

  const pick = async (e: Exercise) => {
    if (!pickDay) return;
    const n = (await all<{ id: string }>('SELECT id FROM program_exercises WHERE day_id=? AND deleted=0', [pickDay])).length;
    await save('program_exercises', { day_id: pickDay, exercise_id: e.id, pos: n, sets: 3, rest_s: 90 });
    router.back();
  };

  const runImport = async () => {
    setBusy(true);
    setStatus('Connexion à wger…');
    try {
      const added = await importWger((n, t) => setStatus(`Import ${n} / ${t}…`));
      setStatus(`${added} exercices ajoutés`);
      reload();
    } catch (e: any) {
      setStatus(`Import impossible (${String(e.message ?? e)}). Vérifie ta connexion.`);
    } finally {
      setBusy(false);
    }
  };

  if (creating) {
    return (
      <Screen footer={<><Btn label="Enregistrer" disabled={!name} onPress={async () => {
        await save('exercises', { name: name.toUpperCase(), muscle: nm, equipment: ne, compound: 0, custom: 1 });
        setName(''); setCreating(false); reload();
      }} /><Btn variant="ghost" label="Annuler" onPress={() => setCreating(false)} /></>}>
        <Title>Nouvel exercice</Title>
        <Field label="Nom" value={name} onChangeText={setName} />
        <T size={12} dim>Muscle</T><Chips options={MUSCLES} value={nm} onChange={setNm} />
        <T size={12} dim>Équipement</T><Chips options={EQUIPMENTS} value={ne} onChange={setNe} color={C.orange} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Title>{pickDay ? 'Choisir un exercice' : 'Exercices'}</Title>
        <TextInput value={q} onChangeText={setQ} placeholder="Rechercher parmi les exercices" placeholderTextColor={C.dim}
          style={{ backgroundColor: C.card, borderRadius: 14, color: C.text, fontSize: 16, padding: 12 }} />
        <Chips options={MUSCLES} value={muscle as any} onChange={(m) => setMuscle(m === muscle ? null : m)} />
        <Chips options={EQUIPMENTS} value={equip as any} onChange={(m) => setEquip(m === equip ? null : m)} color={C.orange} />
        <T size={12} dim>{shown.length} exercices{status ? ` · ${status}` : ''}</T>
      </View>
      <FlatList
        data={shown}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
        initialNumToRender={20}
        renderItem={({ item: e }) => (
          <Pressable onPress={() => pick(e)}>
            <Card style={{ padding: 12, gap: 2 }}>
              <T size={15}>{e.name}</T>
              <T size={12} dim>{e.muscle} · {e.equipment}{e.custom ? ' · perso' : ''}{e.compound ? ' · poly' : ''}</T>
            </Card>
          </Pressable>
        )}
      />
      <View style={{ padding: 16, paddingBottom: 16 + insets.bottom * 0.5, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn style={{ flex: 1 }} variant="orange" label="+ Perso" onPress={() => setCreating(true)} />
          <Btn style={{ flex: 2 }} variant="gold" disabled={busy} label={busy ? 'Import…' : 'Importer 900+ exercices (wger)'} onPress={runImport} />
        </View>
        <Btn variant="ghost" label="Retour" onPress={() => router.back()} />
      </View>
    </View>
  );
}
