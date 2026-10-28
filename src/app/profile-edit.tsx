import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Chips, Field, Screen, T, Title } from '../components/ui';
import { AVATAR_COLORS, AVATAR_EMOJIS, Avatar, TITLES } from '../components/Avatar';
import { getProfile, saveProfileCustom } from '../lib/repo';
import { kvSet } from '../lib/db';
import { cloudEnabled, getSession } from '../lib/auth';
import { pushStats } from '../lib/social';
import { isUsername, normalizeUsername } from '../lib/validate';
import { ACCENTS, C, setAccent } from '../lib/theme';

/** Personnalisation du profil : avatar, couleur, nom affiché, pseudo, bio, titre, couleur de l'app. */
export default function ProfileEdit() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [title, setTitle] = useState<string | null>(null);
  const [accent, setAccentHex] = useState(C.accent);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (!p) return;
      setUsername(p.username ?? ''); setName(p.display_name ?? ''); setBio(p.bio ?? '');
      setAvatar(p.avatar ?? null); setColor(p.avatar_color ?? AVATAR_COLORS[0]); setTitle(p.title ?? null);
      setLoaded(true);
    });
  }, []);
  if (!loaded) return <Screen><T>...</T></Screen>;

  const uname = normalizeUsername(username);
  const usernameOk = uname === '' || isUsername(uname);

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      if (!usernameOk) throw new Error('Pseudo : 3 à 20 caractères (a-z, 0-9, _).');
      await saveProfileCustom({ username: uname || null, display_name: name.trim() || null, bio: bio.trim() || null, avatar, avatar_color: color, title });
      const s = await getSession();
      if (cloudEnabled && s && !s.local && uname) await pushStats(uname);
      await kvSet('accent', accent);
      if (accent !== C.accent) setAccent(accent); // redessine toute l'app
      router.back();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<><Btn label="Enregistrer" disabled={busy} onPress={save} /><Btn variant="ghost" label="Annuler" onPress={() => router.back()} /></>}>
      <Title>Mon profil</Title>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar emoji={avatar} color={color} name={name || username} size={96} />
        <T size={18}>{name || uname || 'Ton nom'}</T>
        {title ? <T size={13} color={C.gold}>{title}</T> : null}
      </View>

      <Card>
        <T size={16}>Avatar</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {AVATAR_EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => setAvatar(e)} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: avatar === e ? color : C.card2, borderWidth: avatar === e ? 2 : 0, borderColor: C.text }}>
              <T size={22}>{e}</T>
            </Pressable>
          ))}
          <Pressable onPress={() => setAvatar(null)} style={{ height: 46, paddingHorizontal: 12, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2 }}><T size={12} dim>Initiale</T></Pressable>
        </View>
        <T size={12} dim>Couleur de fond</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {AVATAR_COLORS.map((c) => (
            <Pressable key={c} accessibilityLabel={`Couleur ${c}`} onPress={() => setColor(c)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: C.text }} />
          ))}
        </View>
      </Card>

      <Field label="Nom affiché (24 max.)" value={name} onChangeText={(v) => setName(v.slice(0, 24))} placeholder="Ton prénom ou surnom" />
      <Field label="Pseudo (unique, visible par tes amis)" value={username} onChangeText={setUsername} placeholder="iron_man" error={!usernameOk ? '3 à 20 caractères : a-z, 0-9, _' : undefined} />
      <View style={{ gap: 6 }}>
        <T size={12} dim>Bio ({bio.length}/160)</T>
        <TextInput value={bio} onChangeText={(v) => setBio(v.slice(0, 160))} multiline placeholder="Ton objectif, ton programme, ta devise…" placeholderTextColor={C.dim}
          style={{ backgroundColor: C.card, borderRadius: 14, color: C.text, fontSize: 16, padding: 14, minHeight: 90, textAlignVertical: 'top' }} />
      </View>

      <Card>
        <T size={16}>Titre</T>
        <Chips options={TITLES} value={title as any} onChange={(t) => setTitle(t === title ? null : t)} color={C.gold} />
        <T size={11} dim>Touche le titre sélectionné pour le retirer.</T>
      </Card>

      <Card>
        <T size={16}>Couleur de l'application</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {ACCENTS.map((a) => (
            <Pressable key={a.hex} accessibilityLabel={`Accent ${a.name}`} onPress={() => setAccentHex(a.hex)} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.hex, borderWidth: accent === a.hex ? 3 : 0, borderColor: C.text }} />
              <T size={10} dim>{a.name}</T>
            </Pressable>
          ))}
        </View>
      </Card>
      {err ? <T size={13} color={C.red}>{err}</T> : null}
    </Screen>
  );
}
