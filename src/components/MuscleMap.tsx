import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { BodyMap } from './BodyRanks';
import { T } from './ui';
import { ALL_API_NAMES, MuscleColor, fetchHeatmapDataUri, heatmapUrl, muscleApiEnabled, toApiParams } from '../lib/muscleApi';

/**
 * Carte musculaire : image anatomique de l'API ExerciseDB (une couleur par muscle) quand la clé RapidAPI est configurée,
 * sinon silhouette hors-ligne. Toute erreur (réseau, quota, plan) retombe sur la silhouette, avec une ligne qui explique pourquoi.
 */
export function MuscleMap({ items, width = 300 }: { items: MuscleColor[]; width?: number }) {
  const [uri, setUri] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const key = items.map((i) => `${i.muscle}:${i.color}`).join('|');

  useEffect(() => {
    setUri(null); setFailed(null);
    if (!muscleApiEnabled || !items.length) return;
    let live = true;
    (async () => {
      try {
        const p = toApiParams(items, ALL_API_NAMES);
        if (!p.muscles.length) throw new Error('aucun muscle reconnu');
        const img = await fetchHeatmapDataUri(heatmapUrl(p.muscles, p.colors));
        if (live) { setUri(img.uri); setRemaining(img.remaining); }
      } catch (e: any) {
        if (live) setFailed(String(e?.message ?? e));
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (uri && !failed) {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
          <Image source={{ uri }} style={{ width, height: width }} resizeMode="contain" onError={() => setFailed('image illisible après téléchargement')} />
        </View>
        {remaining !== null && <T size={11} dim style={{ marginTop: 6 }}>Image ExerciseDB · {remaining} requêtes restantes ce mois</T>}
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
