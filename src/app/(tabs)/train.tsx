import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Chips, Screen, T } from '../../components/ui';
import { RoutineList, Tile } from '../../components/RoutineList';
import { useLoad } from '../../lib/hooks';
import { all, save } from '../../lib/db';
import { createFolder, createRoutine, listFolders, listRoutines, SORT_KEYS, SORT_LABEL, sortRoutines, SortKey } from '../../lib/routines';
import { loadRecovery } from '../../lib/stats';
import { TEMPLATES } from '../../lib/seed';
import { C } from '../../lib/theme';

const TABS = ['Dossiers', 'Routines', 'Exercices'] as const;

export default function Train() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Dossiers');
  const [sort, setSort] = useState<SortKey>('recent');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<'folder' | 'routine' | null>(null);
  const [name, setName] = useState('');
  const [data, reload] = useLoad(async () => ({
    routines: await listRoutines(), folders: await listFolders(), rec: await loadRecovery(),
    exCount: (await all<{ n: number }>('SELECT COUNT(*) n FROM exercises WHERE deleted=0'))[0].n,
  }));
  if (!data) return <Screen><T>...</T></Screen>;
  const { routines, folders, rec } = data;

  const addTemplate = async (tname: string) => {
    const pid = await createFolder(tname);
    let pos = 0;
    for (const [dayName, exNames] of Object.entries(TEMPLATES[tname])) {
      const did = await save('program_days', { program_id: pid, name: dayName, pos: pos++, fav: 0, created_at: Date.now() });
      let ep = 0;
      for (const en of exNames) await save('program_exercises', { day_id: did, exercise_id: `seed-${en}`, pos: ep++, sets: 3, rest_s: 90 });
    }
    reload();
  };
  const nextSort = () => setSort(SORT_KEYS[(SORT_KEYS.indexOf(sort) + 1) % SORT_KEYS.length]);
  const sortedFolders = sort === 'az' ? [...folders].sort((a, b) => a.name.localeCompare(b.name, 'fr')) : sort === 'created' ? [...folders].sort((a, b) => b.created_at - a.created_at)
    : sort === 'used' ? [...folders].sort((a, b) => b.uses - a.uses) : sort === 'exercises' ? [...folders].sort((a, b) => b.routines - a.routines)
    : [...folders].sort((a, b) => (b.lastDone ?? 0) - (a.lastDone ?? 0) || b.created_at - a.created_at);
  const favCount = routines.filter((r) => r.fav).length;
  const unfiled = routines.filter((r) => !r.program_id || !folders.some((f) => f.id === r.program_id));
  const filtered = sortRoutines(routines.filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())), sort);

  const submit = async () => {
    if (!name.trim()) return;
    if (adding === 'folder') await createFolder(name);
    else await createRoutine(name);
    setName(''); setAdding(null); reload();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T size={28}>Bibliothèque</T>
        <Pressable accessibilityLabel="Créer" onPress={() => setAdding(tab === 'Dossiers' ? 'folder' : 'routine')}><T size={34}>+</T></Pressable>
      </View>
      <Chips options={TABS} value={tab} onChange={(t) => { if (t === 'Exercices') router.push('/exercises'); else { setTab(t); setAdding(null); } }} />

      {adding && (
        <Card>
          <T size={14} dim>{adding === 'folder' ? 'Nom du dossier' : 'Nom de la routine'}</T>
          <TextInput value={name} onChangeText={setName} autoFocus placeholder={adding === 'folder' ? 'Push / Pull / Legs' : 'Push A'} placeholderTextColor={C.dim}
            style={{ backgroundColor: C.card2, color: C.text, borderRadius: 12, padding: 14, fontSize: 16 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} label="Créer" disabled={!name.trim()} onPress={submit} />
            <Btn style={{ flex: 1 }} variant="ghost" label="Annuler" onPress={() => { setAdding(null); setName(''); }} />
          </View>
        </Card>
      )}

      <Pressable onPress={nextSort} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
        <T size={16}>↕</T><T size={15}>{SORT_LABEL[sort]}</T><T size={12} dim>(toucher pour changer le tri)</T>
      </Pressable>

      {tab === 'Dossiers' && (
        <View style={{ gap: 12 }}>
          <Pressable onPress={() => setAdding('folder')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><T size={30}>+</T></View>
            <T size={18}>Créer un dossier</T>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/program/[id]', params: { id: 'fav' } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><T size={26} color={C.gold}>★</T></View>
            <View><T size={18}>Favoris</T><T size={14} dim>{favCount} routines</T></View>
          </Pressable>
          {sortedFolders.map((f) => (
            <Pressable key={f.id} onPress={() => router.push({ pathname: '/program/[id]', params: { id: f.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Tile name={f.name} />
              <View style={{ flex: 1 }}><T size={18}>{f.name}</T><T size={14} dim>{f.routines} routines</T></View>
            </Pressable>
          ))}
          {unfiled.length > 0 && (
            <Pressable onPress={() => router.push({ pathname: '/program/[id]', params: { id: 'none' } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><T size={22}>📁</T></View>
              <View><T size={18}>Sans dossier</T><T size={14} dim>{unfiled.length} routines</T></View>
            </Pressable>
          )}
          <T size={13} dim>Modèles</T>
          {Object.keys(TEMPLATES).map((t) => <Btn key={t} variant="ghost" label={`+ ${t}`} onPress={() => addTemplate(t)} />)}
        </View>
      )}

      {tab === 'Routines' && (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher une routine" placeholderTextColor={C.dim}
            style={{ backgroundColor: C.card, color: C.text, borderRadius: 12, padding: 12, fontSize: 16 }} />
          {filtered.length === 0 && <T size={14} dim>Aucune routine. Touche + pour en créer une.</T>}
          <RoutineList routines={filtered} folders={folders} rec={rec} onChange={reload} showFolder />
        </>
      )}
    </Screen>
  );
}
