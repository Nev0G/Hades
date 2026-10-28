import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { BodyMap } from './BodyRanks';
import { T } from './ui';
import { MuscleColor, apiHeaders, availableMuscles, heatmapUrl, muscleApiEnabled, toApiParams } from '../lib/muscleApi';

/**
 * Carte musculaire : image anatomique de l'API ExerciseDB (une couleur par muscle) quand la clé RapidAPI est configurée,
 * sinon silhouette hors-ligne. Toute erreur (réseau, quota, plan) retombe sur la silhouette, avec une ligne qui explique pourquoi.
 */
export function MuscleMap({ items, width = 300 }: { items: MuscleColor[]; width?: number }) {
  const [uri, setUri] = useState<string | null>(null);
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);
  const [failed, setFailed] = useState<string | null>(null);
  const key = items.map((i) => `${i.muscle}:${i.color}`).join('|');

  useEffect(() => {
    setUri(null); setFailed(null);
    if (!muscleApiEnabled || !items.length) return;
    let live = true;
    let blobUrl: string | null = null;
    (async () => {
      try {
        const p = toApiParams(items, await availableMuscles());
        if (!p.muscles.length) throw new Error('aucun muscle reconnu');
        const url = heatmapUrl(p.muscles, p.colors);
        if (Platform.OS === 'web') {
          // <img> ne peut pas envoyer d'en-têtes : on télécharge l'image puis on l'affiche via une URL locale.
          const res = await fetch(url, { headers: apiHeaders() });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          blobUrl = URL.createObjectURL(await res.blob());
          if (live) { setHeaders(undefined); setUri(blobUrl); }
        } else if (live) {
          setHeaders(apiHeaders());
          setUri(url);
        }
      } catch (e: any) {
        if (live) setFailed(String(e?.message ?? e));
      }
    })();
    return () => { live = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (uri && !failed) {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
          <Image source={{ uri, headers }} style={{ width, height: width }} resizeMode="contain" onError={() => setFailed('image illisible')} />
        </View>
      </View>
    );
  }
  const colors: Record<string, string> = {};
  for (const i of items) colors[i.muscle] = i.color;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <BodyMap colors={colors} width={Math.min(150, width / 2.2)} />
      {!muscleApiEnabled ? (
        <T size={11} dim>Silhouette locale : ajoute EXPO_PUBLIC_RAPIDAPI_KEY dans .env puis relance avec --clear pour l'image anatomique.</T>
      ) : failed ? (
        <T size={11} dim>Silhouette locale (image en ligne indisponible : {failed}).</T>
      ) : (
        <T size={11} dim>Chargement de l'image…</T>
      )}
    </View>
  );
}
