import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import { TIER_COLOR, Tier } from '../lib/rank';
import { MuscleRank } from '../lib/stats';

const GREY = '#3A3A3C';

/** Silhouette face / dos hors-ligne : `colors` donne la couleur de chaque groupe musculaire (gris par défaut). */
export function BodyMap({ colors, width = 150 }: { colors: Record<string, string>; width?: number }) {
  const col = (m: string) => colors[m] ?? GREY;
  const h = (width * 250) / 120;
  const base = '#2A2A2D';
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {/* FACE */}
      <Svg width={width} height={h} viewBox="0 0 120 250">
        <Circle cx={60} cy={20} r={13} fill={base} />
        <Path d="M30 40 L90 40 L100 70 L96 120 L84 135 L36 135 L24 120 L20 70 Z" fill={base} />
        <Rect x={36} y={135} width={48} height={20} rx={8} fill={base} />
        <Polygon points="50,34 70,34 82,46 38,46" fill={col('TRAPEZES')} />
        <Ellipse cx={29} cy={54} rx={11} ry={12} fill={col('EPAULES')} />
        <Ellipse cx={91} cy={54} rx={11} ry={12} fill={col('EPAULES')} />
        <Ellipse cx={47} cy={64} rx={14} ry={11} fill={col('PECTORAUX')} />
        <Ellipse cx={73} cy={64} rx={14} ry={11} fill={col('PECTORAUX')} />
        <Ellipse cx={19} cy={84} rx={7} ry={15} fill={col('BICEPS')} />
        <Ellipse cx={101} cy={84} rx={7} ry={15} fill={col('BICEPS')} />
        <Ellipse cx={15} cy={118} rx={6} ry={17} fill={col('AVANT-BRAS')} />
        <Ellipse cx={105} cy={118} rx={6} ry={17} fill={col('AVANT-BRAS')} />
        <Rect x={48} y={80} width={24} height={46} rx={7} fill={col('ABDOS')} />
        <Ellipse cx={46} cy={172} rx={13} ry={30} fill={col('QUADRICEPS')} />
        <Ellipse cx={74} cy={172} rx={13} ry={30} fill={col('QUADRICEPS')} />
        <Ellipse cx={45} cy={228} rx={8} ry={20} fill={col('MOLLETS')} />
        <Ellipse cx={75} cy={228} rx={8} ry={20} fill={col('MOLLETS')} />
      </Svg>
      {/* DOS */}
      <Svg width={width} height={h} viewBox="0 0 120 250">
        <Circle cx={60} cy={20} r={13} fill={base} />
        <Path d="M30 40 L90 40 L100 70 L96 120 L84 135 L36 135 L24 120 L20 70 Z" fill={base} />
        <Rect x={36} y={135} width={48} height={20} rx={8} fill={base} />
        <Polygon points="60,34 42,48 52,80 60,88 68,80 78,48" fill={col('TRAPEZES')} />
        <Ellipse cx={29} cy={54} rx={11} ry={12} fill={col('EPAULES')} />
        <Ellipse cx={91} cy={54} rx={11} ry={12} fill={col('EPAULES')} />
        <Polygon points="38,64 52,86 50,118 40,104" fill={col('DOS')} />
        <Polygon points="82,64 68,86 70,118 80,104" fill={col('DOS')} />
        <Ellipse cx={19} cy={84} rx={7} ry={15} fill={col('TRICEPS')} />
        <Ellipse cx={101} cy={84} rx={7} ry={15} fill={col('TRICEPS')} />
        <Ellipse cx={15} cy={118} rx={6} ry={17} fill={col('AVANT-BRAS')} />
        <Ellipse cx={105} cy={118} rx={6} ry={17} fill={col('AVANT-BRAS')} />
        <Ellipse cx={48} cy={140} rx={13} ry={12} fill={col('FESSIERS')} />
        <Ellipse cx={72} cy={140} rx={13} ry={12} fill={col('FESSIERS')} />
        <Ellipse cx={46} cy={186} rx={12} ry={24} fill={col('ISCHIOS')} />
        <Ellipse cx={74} cy={186} rx={12} ry={24} fill={col('ISCHIOS')} />
        <Ellipse cx={45} cy={230} rx={8} ry={20} fill={col('MOLLETS')} />
        <Ellipse cx={75} cy={230} rx={8} ry={20} fill={col('MOLLETS')} />
      </Svg>
    </View>
  );
}

/** Rangs : chaque muscle est coloré selon son rang (gris = jamais travaillé). */
export function BodyRanks({ muscles, width = 150 }: { muscles: MuscleRank[]; width?: number }) {
  const colors: Record<string, string> = {};
  for (const m of muscles) if (m.tier) colors[m.muscle] = TIER_COLOR[m.tier as Tier];
  return <BodyMap colors={colors} width={width} />;
}
