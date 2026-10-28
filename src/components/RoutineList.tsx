import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, T } from './ui';
import { FolderInfo, RoutineInfo, deleteRoutine, duplicateRoutine, initials, moveRoutine, renameRoutine, tileColor, toggleRoutineFav } from '../lib/routines';
import { readiness, Recovery } from '../lib/recovery';
import { C } from '../lib/theme';

const fmtDate = (t: number | null) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Jamais fait');

export function Tile({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: tileColor(name), alignItems: 'center', justifyContent: 'center' }}>
      <T size={size / 2.4} color="#fff">{initials(name)}</T>
    </View>
  );
}

/** Liste de routines façon bibliothèque : tuile, infos, bouton lecture et menu ⋮ (éditer, renommer, dupliquer, déplacer, favori, supprimer). */
export function RoutineList({ routines, folders, rec, onChange, showFolder }: { routines: RoutineInfo[]; folders: FolderInfo[]; rec: Recovery[]; onChange: () => void; showFolder?: boolean }) {
  const router = useRouter();
  const [menu, setMenu] = useState<string | null>(null);
  const [mode, setMode] = useState<'main' | 'rename' | 'move'>('main');
  const [name, setName] = useState('');
  const done = () => { setMenu(null); setMode('main'); onChange(); };

  return (
    <View style={{ gap: 10 }}>
      {routines.map((r) => {
        const ready = readiness(r.muscles, rec);
        const open = menu === r.id;
        return (
          <View key={r.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Tile name={r.name} />
              <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/day/[id]', params: { id: r.id } })}>
                <T size={17}>{r.fav ? '★ ' : ''}{r.name}</T>
                <T size={13} dim>{r.exercises} exercices{showFolder && r.programName ? ` · ${r.programName}` : ''}</T>
                <T size={12} dim>{fmtDate(r.lastDone)}{r.exercises ? ` · prêt à ${ready} %` : ''}</T>
              </Pressable>
              <Pressable accessibilityLabel={`Lancer ${r.name}`} onPress={() => router.push({ pathname: '/session/[dayId]', params: { dayId: r.id } })}
                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: ready >= 70 ? C.green : C.dim, alignItems: 'center', justifyContent: 'center' }}>
                <T size={18}>▶</T>
              </Pressable>
              <Pressable accessibilityLabel={`Menu ${r.name}`} onPress={() => { setMenu(open ? null : r.id); setMode('main'); setName(r.name); }} style={{ padding: 8 }}>
                <T size={22}>⋮</T>
              </Pressable>
            </View>
            {open && mode === 'main' && (
              <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 10, gap: 6 }}>
                <Btn size="sm" variant="ghost" label="Éditer les exercices" onPress={() => router.push({ pathname: '/day/[id]', params: { id: r.id } })} />
                <Btn size="sm" variant="ghost" label="Renommer" onPress={() => setMode('rename')} />
                <Btn size="sm" variant="ghost" label="Dupliquer" onPress={async () => { await duplicateRoutine(r.id); done(); }} />
                <Btn size="sm" variant="ghost" label="Déplacer dans un dossier" onPress={() => setMode('move')} />
                <Btn size="sm" variant="ghost" label={r.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={async () => { await toggleRoutineFav(r.id); done(); }} />
                <Btn size="sm" variant="ghost" label="Supprimer" onPress={async () => { await deleteRoutine(r.id); done(); }} />
              </View>
            )}
            {open && mode === 'rename' && (
              <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 10, gap: 8 }}>
                <TextInput value={name} onChangeText={setName} autoFocus style={{ backgroundColor: C.card2, color: C.text, borderRadius: 10, padding: 12, fontSize: 16 }} />
                <Btn size="sm" label="Enregistrer" disabled={name.trim().length < 1} onPress={async () => { await renameRoutine(r.id, name); done(); }} />
              </View>
            )}
            {open && mode === 'move' && (
              <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 10, gap: 6 }}>
                <T size={12} dim>Choisir le dossier</T>
                <Btn size="sm" variant={r.program_id === '' ? 'gold' : 'ghost'} label="Sans dossier" onPress={async () => { await moveRoutine(r.id, ''); done(); }} />
                {folders.map((f) => <Btn key={f.id} size="sm" variant={f.id === r.program_id ? 'gold' : 'ghost'} label={f.name} onPress={async () => { await moveRoutine(r.id, f.id); done(); }} />)}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
