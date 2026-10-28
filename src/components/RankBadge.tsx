import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Circle } from 'react-native-svg';
import { TIER_COLOR, Tier, TIERS } from '../lib/rank';

/** Écusson de rang : hexagone coloré, nombre de pointes selon le tier, gemme centrale. */
export function RankBadge({ tier, size = 44 }: { tier: Tier; size?: number }) {
  const c = TIER_COLOR[tier];
  const i = TIERS.indexOf(tier);
  const hex = '50,4 92,27 92,73 50,96 8,73 8,27';
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points={hex} fill="#111114" stroke={c} strokeWidth={6} strokeLinejoin="round" />
        <Polygon points="50,24 74,50 50,76 26,50" fill={c} fillOpacity={0.25 + i * 0.09} stroke={c} strokeWidth={3} />
        {i >= 3 && <Circle cx={50} cy={50} r={7} fill={c} />}
        {i >= 6 && <Polygon points="50,0 56,12 44,12" fill={c} />}
        {i >= 8 && [18, 82].map((x) => <Circle key={x} cx={x} cy={14} r={5} fill={c} />)}
      </Svg>
    </View>
  );
}
