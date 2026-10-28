import React, { useCallback, useState } from 'react';
import { Share, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Btn, Card, Chips, Field, Screen, T } from '../../components/ui';
import { RankBadge } from '../../components/RankBadge';
import { Avatar } from '../../components/Avatar';
import { cloudEnabled, getSession, signOut } from '../../lib/auth';
import { getProfile } from '../../lib/repo';
import { save } from '../../lib/db';
import { isUsername, normalizeUsername } from '../../lib/validate';
import { TIERS, TIER_COLOR } from '../../lib/rank';
import * as S from '../../lib/social';
import { Metric } from '../../lib/stats';
import { C } from '../../lib/theme';

const TABS = ['Classement', 'Amis', 'Défis'] as const;
const METRIC_LABEL: Record<Metric, string> = { xp: 'XP gagnés', volume: 'Volume (kg)', sessions: 'Séances' };

function Row({ p, rank, me, right, onPress }: { p: S.PublicProfile; rank?: number; me?: boolean; right?: React.ReactNode; onPress?: () => void }) {
  const tier = TIERS[p.rank_index] ?? 'WOOD';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      {rank !== undefined && <T size={16} color={rank < 3 ? C.gold : C.dim} style={{ width: 26 }}>{rank + 1}</T>}
      <Avatar emoji={p.avatar} color={p.avatar_color} name={p.display_name || p.username} size={40} />
      <View style={{ flex: 1 }}>
        <T size={15} color={me ? C.accent : C.text}>{p.display_name || p.username}{me ? ' (toi)' : ''}</T>
        <T size={12} color={TIER_COLOR[tier]}>{tier} · niv. {p.level}{p.title ? ` · ${p.title}` : ''}</T>
      </View>
      {right ?? <T size={15}>{p.xp} XP</T>}
    </Pressable>
  );
}

export default function Social() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Classement');
  const [state, setState] = useState<'loading' | 'off' | 'nouser' | 'ready'>('loading');
  const [username, setUsername] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [me, setMe] = useState<string>('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  // classement
  const [kind, setKind] = useState<'global' | 'week' | 'friends'>('global');
  const [board, setBoard] = useState<S.PublicProfile[]>([]);
  // amis
  const [q, setQ] = useState('');
  const [found, setFound] = useState<S.PublicProfile[]>([]);
  const [ov, setOv] = useState<Awaited<ReturnType<typeof S.friendOverview>> | null>(null);
  // défis
  const [mine, setMine] = useState<S.Challenge[]>([]);
  const [pub, setPub] = useState<S.Challenge[]>([]);
  const [open, setOpen] = useState<{ c: S.Challenge; members: S.Member[] } | null>(null);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<Metric>('xp');
  const [days, setDays] = useState<'7 jours' | '14 jours' | '30 jours'>('7 jours');
  const [isPublic, setIsPublic] = useState(false);
  const [code, setCode] = useState('');

  const guard = async (fn: () => Promise<unknown>) => {
    setErr(''); setInfo('');
    try { await fn(); } catch (e: any) { setErr(String(e?.message ?? e)); }
  };

  const loadAll = useCallback(async () => {
    if (!cloudEnabled) return setState('off');
    const s = await getSession();
    if (!s || s.local) return setState('off');
    const p = await getProfile();
    const u = p?.username ?? s.username ?? null;
    setUsername(u);
    setMe(s.userId ?? '');
    if (!u) return setState('nouser');
    setState('ready');
    await guard(async () => {
      await S.pushStats(u);
      setBoard(await S.leaderboard(kind));
      setOv(await S.friendOverview());
      setMine(await S.myChallenges());
      setPub(await S.publicChallenges());
    });
  }, [kind]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const refresh = () => guard(async () => {
    setBoard(await S.leaderboard(kind)); setOv(await S.friendOverview()); setMine(await S.myChallenges()); setPub(await S.publicChallenges());
  });

  if (state === 'loading') return <Screen><T>...</T></Screen>;
  if (state === 'off') {
    return (
      <Screen>
        <T size={26}>Social</T>
        <Card>
          <T size={16}>Amis, classements et défis</T>
          <T size={13} dim>Cette partie utilise un compte en ligne (Supabase). {cloudEnabled ? 'Ton compte actuel est local (sur ce téléphone uniquement). Crée un compte en ligne pour ajouter des amis.' : 'Aucun serveur n’est configuré : ajoute EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env (voir le README), puis relance l’app avec --clear.'}</T>
          {cloudEnabled && <Btn label="Créer un compte en ligne" onPress={async () => { await signOut(); router.replace('/login'); }} />}
          {cloudEnabled && <T size={11} dim>Tes données locales restent sur le téléphone ; reconnecte-toi avec le nouveau compte pour les synchroniser.</T>}
        </Card>
      </Screen>
    );
  }
  if (state === 'nouser') {
    const n = normalizeUsername(pseudo);
    return (
      <Screen footer={<Btn label="Valider mon pseudo" disabled={!isUsername(n)} onPress={() => guard(async () => {
        const p = await getProfile();
        if (p) await save('profile', { ...p, username: n });
        await S.pushStats(n);
        setUsername(n); setState('ready'); loadAll();
      })} />}>
        <T size={26}>Choisis ton pseudo</T>
        <T size={13} dim>Il sera visible par les autres joueurs dans les classements.</T>
        <Field label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="iron_man" error={pseudo && !isUsername(n) ? '3 à 20 caractères : a-z, 0-9, _' : undefined} />
        {err ? <T size={13} color={C.red}>{err}</T> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <T size={26}>Social</T>
      <Chips options={TABS} value={tab} onChange={(t) => { setTab(t); setOpen(null); }} />
      {ov && ov.incoming.length > 0 && tab !== 'Amis' && (
        <Pressable onPress={() => setTab('Amis')} style={{ backgroundColor: C.card, borderRadius: 14, padding: 12, borderLeftWidth: 4, borderLeftColor: C.accent }}>
          <T size={14}>🔔 {ov.incoming.length} demande{ov.incoming.length > 1 ? 's' : ''} d'ami en attente</T>
        </Pressable>
      )}
      {err ? <T size={13} color={C.red}>{err}</T> : null}
      {info ? <T size={13} color={C.green}>{info}</T> : null}

      {tab === 'Classement' && (
        <>
          <Chips options={['Global', 'Semaine', 'Amis'] as const} value={kind === 'global' ? 'Global' : kind === 'week' ? 'Semaine' : 'Amis'} onChange={(k) => setKind(k === 'Global' ? 'global' : k === 'Semaine' ? 'week' : 'friends')} color={C.orange} />
          <T size={12} dim>{kind === 'global' ? 'Tous les joueurs · XP total' : kind === 'week' ? 'Tous les joueurs · XP des 7 derniers jours' : 'Toi et tes amis'}</T>
          <Card>
            {board.length === 0 && <T size={13} dim>Aucun joueur pour l’instant.</T>}
            {board.map((p, i) => <Row key={p.user_id} p={p} rank={i} me={p.user_id === me} onPress={p.user_id === me ? undefined : () => router.push({ pathname: '/friend/[id]', params: { id: p.user_id } })} right={<T size={15}>{kind === 'week' ? p.week_xp : p.xp} XP</T>} />)}
          </Card>
        </>
      )}

      {tab === 'Amis' && (
        <>
          <Btn variant="ghost" label="Inviter un ami (partager mon pseudo)" onPress={() => Share.share({ message: `Rejoins-moi sur HADES ! Ajoute-moi avec mon pseudo : @${username}` }).catch(() => {})} />
          <Field label="Chercher un pseudo" value={q} onChangeText={(v) => { setQ(v); guard(async () => setFound(await S.searchUsers(v))); }} placeholder="pseudo" />
          {found.map((p) => (
            <Card key={p.user_id} style={{ padding: 12 }}>
              <Row p={p} right={<Btn size="sm" label="Ajouter" onPress={() => guard(async () => { await S.sendFriendRequest(p.user_id); setInfo(`Demande envoyée à ${p.username}`); setFound([]); setQ(''); await refresh(); })} />} />
            </Card>
          ))}
          {ov && ov.incoming.length > 0 && (
            <Card>
              <T size={16}>Demandes reçues</T>
              {ov.incoming.map(({ f, profile }) => profile && (
                <Row key={f.id} p={profile} right={
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Btn size="sm" label="Accepter" onPress={() => guard(async () => { await S.acceptFriend(f.id); await refresh(); })} />
                    <Btn size="sm" variant="ghost" label="Refuser" onPress={() => guard(async () => { await S.removeFriendship(f.id); await refresh(); })} />
                  </View>} />
              ))}
            </Card>
          )}
          <Card>
            <T size={16}>Mes amis</T>
            {ov?.friends.length === 0 && <T size={13} dim>Pas encore d’amis : cherche leur pseudo ci-dessus.</T>}
            {ov?.friends.map(({ f, profile }) => profile && (
              <Row key={f.id} p={profile} onPress={() => router.push({ pathname: '/friend/[id]', params: { id: profile.user_id } })} right={<T size={13} dim>Voir ›</T>} />
            ))}
            {ov && ov.outgoing.length > 0 && <T size={12} dim>En attente : {ov.outgoing.map((o) => o.profile?.username).join(', ')}</T>}
          </Card>
        </>
      )}

      {tab === 'Défis' && !open && (
        <>
          <Card>
            <T size={16}>Créer un défi</T>
            <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Le plus de volume cette semaine" />
            <Chips options={['XP', 'Volume', 'Séances'] as const} value={metric === 'xp' ? 'XP' : metric === 'volume' ? 'Volume' : 'Séances'} onChange={(m) => setMetric(m === 'XP' ? 'xp' : m === 'Volume' ? 'volume' : 'sessions')} color={C.orange} />
            <T size={12} dim>Classé par : {METRIC_LABEL[metric]}</T>
            <Chips options={['7 jours', '14 jours', '30 jours'] as const} value={days} onChange={setDays} />
            <Chips options={['Privé (code)', 'Public'] as const} value={isPublic ? 'Public' : 'Privé (code)'} onChange={(v) => setIsPublic(v === 'Public')} color={C.gold} />
            <Btn label="Lancer le défi" disabled={title.trim().length < 3} onPress={() => guard(async () => {
              const c = await S.createChallenge({ title, metric, days: parseInt(days, 10), isPublic }, username!);
              setTitle(''); setInfo(c.is_public ? 'Défi public créé.' : `Défi créé. Code à partager : ${c.code}`); await S.pushStats(username!); await refresh();
            })} />
          </Card>
          <Card>
            <T size={16}>Rejoindre avec un code</T>
            <Field label="Code" value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="A1B2C3" />
            <Btn variant="ghost" label="Rejoindre" disabled={code.trim().length < 4} onPress={() => guard(async () => { await S.joinByCode(code); setCode(''); setInfo('Défi rejoint !'); await S.pushStats(username!); await refresh(); })} />
          </Card>
          <T size={18}>Mes défis</T>
          {mine.length === 0 && <T size={13} dim>Aucun défi en cours.</T>}
          {mine.map((c) => (
            <Card key={c.id} style={{ padding: 12 }}>
              <T size={16} onPress={() => guard(async () => setOpen({ c, members: await S.standings(c.id) }))}>{c.title}</T>
              <T size={12} dim>{METRIC_LABEL[c.metric]} · {c.end_at < Date.now() ? 'terminé' : `fin ${new Date(c.end_at).toLocaleDateString()}`} · code {c.code}</T>
            </Card>
          ))}
          <T size={18}>Défis publics</T>
          {pub.filter((c) => !mine.some((m) => m.id === c.id)).map((c) => (
            <Card key={c.id} style={{ padding: 12 }}>
              <T size={16}>{c.title}</T>
              <T size={12} dim>{METRIC_LABEL[c.metric]} · fin {new Date(c.end_at).toLocaleDateString()}</T>
              <Btn size="sm" label="Participer" onPress={() => guard(async () => { await S.joinPublicChallenge(c.id, username!); await S.pushStats(username!); await refresh(); })} />
            </Card>
          ))}
        </>
      )}

      {tab === 'Défis' && open && (
        <>
          <Btn size="sm" variant="ghost" label="< Retour" onPress={() => setOpen(null)} />
          <Card>
            <T size={20}>{open.c.title}</T>
            <T size={12} dim>{METRIC_LABEL[open.c.metric]} · code {open.c.code}</T>
            {open.members.map((m, i) => (
              <View key={m.user_id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
                <T size={16} color={i === 0 ? C.gold : C.dim} style={{ width: 26 }}>{i + 1}</T>
                <T size={15} color={m.user_id === me ? C.accent : C.text} style={{ flex: 1 }}>{m.username}</T>
                <T size={15}>{Math.round(m.score)}</T>
              </View>
            ))}
            <Btn size="sm" variant="ghost" label="Quitter le défi" onPress={() => guard(async () => { await S.leaveChallenge(open.c.id); setOpen(null); await refresh(); })} />
          </Card>
        </>
      )}
    </Screen>
  );
}
