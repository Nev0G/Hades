import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, Screen, T } from '../../components/ui';
import { RoutineList, Tile } from '../../components/RoutineList';
import { useLoad } from '../../lib/hooks';
import { createRoutine, deleteFolder, listFolders, listRoutines, renameFolder, SORT_KEYS, SORT_LABEL, sortRoutines, SortKey } from '../../lib/routines';
import { loadRecovery } from '../../lib/stats';
import { C } from '../../lib/theme';

/** Détail d'un dossier ('fav' = favoris, 'none' = sans dossier). */
export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>('recent');
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [rname, setRname] = useState<string | null>(null);
  const [d, reload] = useLoad(async () => ({ routines: await listRoutines(), folders: await listFolders(), rec: await loadRecovery() }), [id]);
  if (!d) return <Screen><T>...</T></Screen>;

  const folder = d.folders.find((f) => f.id === id);
  const title = id === 'fav' ? 'Favoris' : id === 'none' ? 'Sans dossier' : folder?.name ?? 'Dossier';
  const list = d.routines.filter((r) => (id === 'fav' ? r.fav : id === 'none' ? !r.program_id || !d.folders.some((f) => f.id === r.program_id) : r.program_id === id));
  const sorted = sortRoutines(list, sort);
  const realFolder = id !== 'fav' && id !== 'none';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><T size={20}>←</T></Pressable>
        {realFolder && <Pressable accessibilityLabel="Menu dossier" onPress={() => setMenu(!menu)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><T size={20}>⋮</T></Pressable>}
      </View>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
        <Tile name={title} size={110} />
        <T size={28}>{title}</T>
      </View>
      {menu && realFolder && (
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 10, gap: 6 }}>
          {rname === null ? (
            <>
              <Btn size="sm" variant="ghost" label="Renommer le dossier" onPress={() => setRname(folder?.name ?? '')} />
              <Btn size="sm" variant="ghost" label="Supprimer le dossier (garde les routines)" onPress={async () => { await deleteFolder(id); router.back(); }} />
            </>
          ) : (
            <>
              <TextInput value={rname} onChangeText={setRname} autoFocus style={{ backgroundColor: C.card2, color: C.text, borderRadius: 10, padding: 12, fontSize: 16 }} />
              <Btn size="sm" label="Enregistrer" disabled={!rname.trim()} onPress={async () => { await renameFolder(id, rname); setRname(null); setMenu(false); reload(); }} />
            </>
          )}
        </View>
      )}
      {realFolder && (adding ? (
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 12, gap: 8 }}>
          <TextInput value={name} onChangeText={setName} autoFocus placeholder="Nom de la routine" placeholderTextColor={C.dim} style={{ backgroundColor: C.card2, color: C.text, borderRadius: 10, padding: 12, fontSize: 16 }} />
          <Btn size="sm" label="Ajouter" disabled={!name.trim()} onPress={async () => { await createRoutine(name, id); setName(''); setAdding(false); reload(); }} />
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><T size={30}>+</T></View>
          <T size={17} style={{ flex: 1 }}>Ajouter une routine au dossier</T>
        </Pressable>
      ))}
      <Pressable onPress={() => setSort(SORT_KEYS[(SORT_KEYS.indexOf(sort) + 1) % SORT_KEYS.length])} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <T size={16}>↕</T><T size={15}>{SORT_LABEL[sort]}</T>
      </Pressable>
      {sorted.length === 0 && <T size={14} dim>Aucune routine ici.</T>}
      <RoutineList routines={sorted} folders={d.folders} rec={d.rec} onChange={reload} />
    </Screen>
  );
}
