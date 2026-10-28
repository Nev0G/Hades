import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SText } from 'react-native-svg';
import { C } from '../lib/theme';

/** Graphique wireframe : grille matricielle + ligne brute, sans lissage. */
export function WireChart({ data, width = 320, height = 160, color = C.orange, unit = '' }: { data: number[]; width?: number; height?: number; color?: string; unit?: string }) {
  const padL = 40, padB = 8, padT = 8;
  if (data.length === 0) return <View style={{ height, justifyContent: 'center' }}><SText /></View>;
  const min = Math.min(...data), max = Math.max(...data);
  const lo = min === max ? min - 1 : min, hi = min === max ? max + 1 : max;
  const w = width - padL - 8, h = height - padT - padB;
  const x = (i: number) => padL + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => padT + h - ((v - lo) / (hi - lo)) * h;
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Rect x={padL} y={padT} width={w} height={h} stroke={C.line} strokeWidth={1.5} rx={10} fill="none" />
      {[0, 1, 2, 3].map((i) => (
        <Line key={`h${i}`} x1={padL} x2={padL + w} y1={padT + (h / 3) * i} y2={padT + (h / 3) * i} stroke="#30343E" strokeWidth={1} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Line key={`v${i}`} x1={padL + (w / 5) * i} x2={padL + (w / 5) * i} y1={padT} y2={padT + h} stroke="#30343E" strokeWidth={1} />
      ))}
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => <Rect key={i} x={x(i) - 3} y={y(v) - 3} width={6} height={6} rx={3} fill={C.gold} />)}
      <SText x={2} y={padT + 10} fill={C.dim} fontSize={10} fontFamily="monospace">{Math.round(hi * 10) / 10}{unit}</SText>
      <SText x={2} y={padT + h} fill={C.dim} fontSize={10} fontFamily="monospace">{Math.round(lo * 10) / 10}{unit}</SText>
    </Svg>
  );
}
