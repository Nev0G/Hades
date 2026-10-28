import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { BodyMap } from './BodyRanks';
import { apiHeaders, availableMuscles, highlightUrl, mapMuscles, muscleApiEnabled } from '../lib/muscleApi';

/**
 * Carte musculaire. `colors` (hors-ligne, une couleur par muscle) est toujours disponible ;
 * `api` demande en plus l'image de l'API ExerciseDB (une couleur) quand la clé RapidAPI est configurée.
 * Toute erreur de l'API retombe automatiquement sur la silhouette locale.
 */
export function MuscleMap({ colors, api, width = 150 }: { colors: Record<string, string>; api?: { muscles: string[]; color: string }; width?: number }) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const key = api ? `${api.muscles.join(',')}|${api.color}` : '';

  useEffect(() => {
    setUri(null); setFailed(false);
    if (!api || !muscleApiEnabled || Platform.OS === 'web' || !api.muscles.length) return;
    let live = true;
    availableMuscles()
      .then((av) => { const m = mapMuscles(api.muscles, av); if (live) m.length ? setUri(highlightUrl(m, api.color)) : setFailed(true); })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (uri && !failed) {
    return (
      <View style={{ alignItems: 'center' }}>
        <Image source={{ uri, headers: apiHeaders() }} style={{ width: width * 2 + 8, height: (width * 250) / 120 }} resizeMode="contain" onError={() => setFailed(true)} />
      </View>
    );
  }
  return <BodyMap colors={colors} width={width} />;
}
