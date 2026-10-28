import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, Card, Screen, T } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { RankBadge } from '../../components/RankBadge';
import { MuscleMap } from '../../components/MuscleMap';
import { useLoad } from '../../lib/hooks';
import { exerciseStats, muscleRanks } from '../../lib/stats';
import { TIER_COLOR, TIERS, tierOfScore } from '../../lib/rank';
import { MUSCLES } from '../../lib/seed';
import * as S from '../../lib/social';
import { C } from '../../lib/theme';

/** Profil d'un joueur : rang, niveau, carte musculaire et comparaison muscle par muscle avec toi. */
export default function FriendProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [err, setErr] = useState('');
  const [d] = useLoad(async () => {
    try {
      const p = await S.profileById(id);
      const mine = muscleRanks(await exerciseStats());
      const fr = (await S.friendships()).find((f) => f.status === 'accepted' && (f.requester === id || f.addressee === id)) ?? null;
      return { p, mine, fr };
    } catch (e: any) { setErr(String(e?.message ?? e)); return { p: null, mine: null, fr: null }; }
  }, [id]);
  if (!d) return <Screen><T>...</T></Screen>;
  if (!d.p) return <Screen footer={<Btn variant="ghost" label="Retour" onPress={() => router.back()} />}><T size={14} color={C.red}>{err || 'Profil introuvable.'}</T></Screen>;

  const p = d.p;
  const theirTier = TIERS[p.rank_index] ?? 'WOOD';
  const score = (m: string) => p.muscle_ranks?.[m];
  const items = MUSCLES.filter((m) => score(m) !== undefined).map((m) => ({ muscle: m, color: TIER_COLOR[tierOfScore(score(m)!)] }));
  let wins = 0, losses = 0;
  const rows = MUSCLES.map((m) => {
    const a = d.mine?.muscles.find((x) => x.muscle === m)?.score ?? null, b = score(m) ?? null;
    if (a !== null && b !== null) { if (a > b) wins++; else if (b > a) losses++; }
    return { m, a, b };
  }).filter((r) => r.a !== null || r.b !== null);

  return (
    <Screen footer={<>
      {d.fr && <Btn variant="ghost" label="Retirer des amis" onPress={async () => { try { await S.removeFriendship(d.fr!.id); router.back(); } catch (e: any) { setErr(String(e?.message ?? e)); } }} />}
      <Btn variant="ghost" label="Retour" onPress={() => router.back()} />
    </>}>
      <Card>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Avatar emoji={p.avatar} color={p.avatar_color} name={p.display_name || p.username} size={88} />
          <T size={22}>{p.display_name || p.username}</T>
          <T size={13} dim>@{p.username}</T>
          {p.title ? <T size={13} color={C.gold}>{p.title}</T> : null}
          {p.bio ? <T size={14} style={{ textAlign: 'center' }}>{p.bio}</T> : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          <View style={{ alignItems: 'center' }}><RankBadge tier={theirTier} size={52} /><T size={12} color={TIER_COLOR[theirTier]}>{theirTier}</T></View>
          <View style={{ alignItems: 'center' }}><T size={22}>{p.level}</T><T size={11} dim>Niveau</T></View>
          <View style={{ alignItems: 'center' }}><T size={22}>{p.xp}</T><T size={11} dim>XP</T></View>
          <View style={{ alignItems: 'center' }}><T size={22}>{p.week_xp}</T><T size={11} dim>XP / 7 j</T></View>
        </View>
      </Card>

      {items.length > 0 && <Card><T size={16}>Sa carte musculaire</T><MuscleMap items={items} width={110} /></Card>}

      <Card>
        <T size={16}>Toi contre {p.display_name || p.username}</T>
        <T size={13} dim>{wins} muscles devant · {losses} derrière</T>
        {rows.map(({ m, a, b }) => {
          const ta = a === null ? null : tierOfScore(a), tb = b === null ? null : tierOfScore(b);
          return (
            <View key={m} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 }}>
              <T size={13} style={{ flex: 1 }}>{m}</T>
              <T size={13} color={ta ? TIER_COLOR[ta] : C.dim} style={{ width: 90, textAlign: 'right' }}>{ta ?? '—'}</T>
              <T size={13} dim>vs</T>
              <T size={13} color={tb ? TIER_COLOR[tb] : C.dim} style={{ width: 90 }}>{tb ?? '—'}</T>
            </View>
          );
        })}
        {rows.length === 0 && <T size={13} dim>Aucun muscle classé pour l'instant.</T>}
      </Card>
      {err ? <T size={13} color={C.red}>{err}</T> : null}
    </Screen>
  );
}
