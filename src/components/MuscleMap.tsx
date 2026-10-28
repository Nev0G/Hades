import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { BodyMap } from './BodyRanks';
import { MuscleColor, apiHeaders, availableMuscles, heatmapUrl, muscleApiEnabled, toApiParams } from '../lib/muscleApi';

/**
 * Carte musculaire : image anatomique de l'API ExerciseDB (une couleur par muscle) quand la clé RapidAPI est configurée,
 * sinon silhouette hors-ligne. Toute erreur (réseau, quota, plan) retombe automatiquement sur la silhouette locale.
 */
export function MuscleMap({ items, width = 300 }: { items: MuscleColor[]; width?: number }) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const key = items.map((i) => `${i.muscle}:${i.color}`).join('|');

  useEffect(() => {
    setUri(null); setFailed(false);
    if (!muscleApiEnabled || Platform.OS === 'web' || !items.length) return;
    let live = true;
    availableMuscles()
      .then((av) => {
        const p = toApiParams(items, av);
        if (!live) return;
        if (p.muscles.length) setUri(heatmapUrl(p.muscles, p.colors)); else setFailed(true);
      })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (uri && !failed) {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
          <Image source={{ uri, headers: apiHeaders() }} style={{ width, height: width }} resizeMode="contain" onError={() => setFailed(true)} />
        </View>
      </View>
    );
  }
  const colors: Record<string, string> = {};
  for (const i of items) colors[i.muscle] = i.color;
  return <BodyMap colors={colors} width={Math.min(150, width / 2.2)} />;
}
