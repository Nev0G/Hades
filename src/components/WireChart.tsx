import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Text as SText } from 'react-native-svg';
import { C } from '../lib/theme';

/** Graphique wireframe : grille matricielle + ligne brute, sans lissage. */
export function WireChart({ data, width = 320, height = 160, color = C.accent, unit = '' }: { data: number[]; width?: number; height?: number; color?: string; unit?: string }) {
  const padL = 40, padB = 8, padT = 8;
  if (data.length === 0) return <View style={{ height: 40 }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const lo = min === max ? min - 1 : min, hi = min === max ? max + 1 : max;
  const w = width - padL - 8, h = height - padT - padB;
  const x = (i: number) => padL + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => padT + h - ((v - lo) / (hi - lo)) * h;
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${x(0)},${padT + h} ${pts} ${x(data.length - 1)},${padT + h}`;
  return (
    <Svg width={width} height={height}>
      {[0, 1, 2, 3].map((i) => (
        <Line key={`h${i}`} x1={padL} x2={padL + w} y1={padT + (h / 3) * i} y2={padT + (h / 3) * i} stroke="#38383A" strokeWidth={1} />
      ))}
      <Polygon points={area} fill={color} fillOpacity={0.18} />
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={4} fill={C.bg} stroke={color} strokeWidth={2} />)}
      <SText x={0} y={padT + 10} fill={C.dim} fontSize={10}>{Math.round(hi * 10) / 10}{unit}</SText>
      <SText x={0} y={padT + h} fill={C.dim} fontSize={10}>{Math.round(lo * 10) / 10}{unit}</SText>
    </Svg>
  );
}
