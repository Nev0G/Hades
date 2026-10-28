import React from 'react';
import { Image, View } from 'react-native';
import { T } from './ui';
import { Layer, MuscleColor, WGER_CREDIT, layersFor } from '../lib/muscleMap';

// require() statiques : le bundler doit connaître chaque image.
const BASE = { front: require('../../assets/muscles/front.png'), back: require('../../assets/muscles/back.png') };
const MUSCLE: Record<number, number> = {
  1: require('../../assets/muscles/m1.png'), 2: require('../../assets/muscles/m2.png'), 4: require('../../assets/muscles/m4.png'),
  5: require('../../assets/muscles/m5.png'), 6: require('../../assets/muscles/m6.png'), 7: require('../../assets/muscles/m7.png'),
  8: require('../../assets/muscles/m8.png'), 9: require('../../assets/muscles/m9.png'), 10: require('../../assets/muscles/m10.png'),
  11: require('../../assets/muscles/m11.png'), 12: require('../../assets/muscles/m12.png'), 13: require('../../assets/muscles/m13.png'),
  14: require('../../assets/muscles/m14.png'), 15: require('../../assets/muscles/m15.png'),
};
const RATIO = 369 / 200;

function Figure({ view, layers, width }: { view: 'front' | 'back'; layers: Layer[]; width: number }) {
  const h = width * RATIO;
  return (
    <View style={{ width, height: h }}>
      <Image source={BASE[view]} style={{ position: 'absolute', width, height: h }} resizeMode="contain" />
      {layers.map((l, i) => (
        <Image key={`${l.id}-${i}`} source={MUSCLE[l.id]} style={{ position: 'absolute', width, height: h, tintColor: l.color }} resizeMode="contain" />
      ))}
    </View>
  );
}

/** Silhouette anatomique face / dos : chaque groupe musculaire prend la couleur donnée. Hors-ligne, sans clé ni quota. */
export function MuscleMap({ items, width = 150, credit = true }: { items: MuscleColor[]; width?: number; credit?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#F2F2F4', borderRadius: 16, padding: 10 }}>
        <Figure view="front" layers={layersFor('front', items)} width={width} />
        <Figure view="back" layers={layersFor('back', items)} width={width} />
      </View>
      {credit && <T size={10} dim>{WGER_CREDIT}</T>}
    </View>
  );
}
