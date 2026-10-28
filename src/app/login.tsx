import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Field, Screen, T } from '../components/ui';
import { cloudEnabled, resetPassword, signIn, signInWithProvider, signUp } from '../lib/auth';
import { isEmail, normalizeUsername, passwordStrength, validateSignup } from '../lib/validate';
import { C } from '../lib/theme';

const STRENGTH_COLOR = [C.red, C.red, C.orange, C.gold, C.green];

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [touched, setTouched] = useState(false);

  const form = { username: normalizeUsername(username), email: email.trim(), password: pw, confirm, consent };
  const errors = mode === 'signup' ? validateSignup(form) : {};
  const strength = passwordStrength(pw);
  const loginValid = isEmail(form.email) && pw.length >= 1;
  const valid = mode === 'signup' ? Object.keys(errors).length === 0 : loginValid;
  const show_ = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(''); setInfo('');
    try {
      await fn();
      router.replace('/onboarding');
    } catch (e: any) {
      const m = String(e?.message ?? e);
      if (/CONFIRME/.test(m)) { setInfo(m); setMode('login'); } else setError(m.toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    run(() => (mode === 'signup' ? signUp(form.email, pw, form.username) : signIn(form.email, pw)));
  };

  return (
    <Screen
      footer={
        <>
          <Btn label={mode === 'signup' ? 'Créer mon compte' : 'Me connecter'} disabled={busy} onPress={submit} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} variant="ghost" label="Google" disabled={busy} onPress={() => run(() => signInWithProvider('google'))} />
            <Btn style={{ flex: 1 }} variant="ghost" label="Apple" disabled={busy} onPress={() => run(() => signInWithProvider('apple'))} />
          </View>
        </>
      }
    >
      <View style={{ height: 24 }} />
      <T size={48} color={C.blue}>HADES</T>
      <T size={16} dim>Suis tes séances, ta nutrition et monte en rang.</T>

      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4 }}>
        {(['signup', 'login'] as const).map((m) => (
          <Pressable key={m} onPress={() => { setMode(m); setError(''); setInfo(''); setTouched(false); }} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: mode === m ? C.blue : 'transparent' }}>
            <T size={15} color={mode === m ? '#fff' : C.dim} style={{ textAlign: 'center' }}>{m === 'signup' ? 'Inscription' : 'Connexion'}</T>
          </Pressable>
        ))}
      </View>

      {mode === 'signup' && (
        <Field label="Pseudo (visible par tes amis)" value={username} onChangeText={setUsername} placeholder="iron_man" error={show_('username')} />
      )}
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="toi@exemple.com" error={show_('email')} />
      <Field
        label="Mot de passe" value={pw} onChangeText={setPw} secure={!show} placeholder={mode === 'signup' ? '8 caractères minimum' : ''}
        error={show_('password')}
        right={<T size={13} color={C.blue} onPress={() => setShow(!show)}>{show ? 'Masquer' : 'Voir'}</T>}
      />
      {mode === 'signup' && (
        <>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4].map((i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= strength.score ? STRENGTH_COLOR[strength.score] : C.card2 }} />)}
            </View>
            <T size={12} dim>{strength.label || 'Utilise majuscules, chiffres et symboles pour un mot de passe solide.'}</T>
          </View>
          <Field label="Confirmer le mot de passe" value={confirm} onChangeText={setConfirm} secure={!show} error={show_('confirm')} />
          <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: consent ? C.blue : C.card2, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              {consent ? <T size={15} color="#fff">✓</T> : null}
            </View>
            <T size={13} dim style={{ flex: 1 }}>
              J'accepte les conditions d'utilisation et le traitement de mes données (RGPD) pour le suivi, la synchronisation et les classements. Je peux les exporter ou les supprimer à tout moment.
            </T>
          </Pressable>
          {show_('consent') ? <T size={12} color={C.red}>{show_('consent')}</T> : null}
        </>
      )}
      {mode === 'login' && (
        <T size={13} color={C.blue} onPress={() => run(async () => { await resetPassword(form.email); throw new Error('CONFIRME : EMAIL DE REINITIALISATION ENVOYE.'); })}>Mot de passe oublié ?</T>
      )}
      {!!error && <T size={13} color={C.red}>{error}</T>}
      {!!info && <T size={13} color={C.green}>{info}</T>}
      {!cloudEnabled && <T size={12} dim>Mode local : aucun serveur configuré. Les données restent sur cet appareil, sans classement ni amis.</T>}
    </Screen>
  );
}
