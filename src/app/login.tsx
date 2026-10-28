import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Field, Screen, T, Title } from '../components/ui';
import { cloudEnabled, signIn, signInWithProvider, signUp } from '../lib/auth';
import { C } from '../lib/theme';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      router.replace('/onboarding');
    } catch (e: any) {
      setError(String(e.message ?? e).toUpperCase());
    } finally {
      setBusy(false);
    }
  };
  const mail = email.trim();
  const valid = /.+@.+\..+/.test(mail) && pw.length >= 6;

  return (
    <Screen
      footer={
        <>
          <Btn label="CONNEXION" disabled={!valid || busy} onPress={() => run(() => signIn(mail, pw))} />
          <Btn label="CREER UN COMPTE" variant="gold" disabled={!valid || busy} onPress={() => run(() => signUp(mail, pw))} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} variant="ghost" label="GOOGLE" disabled={busy} onPress={() => run(() => signInWithProvider('google'))} />
            <Btn style={{ flex: 1 }} variant="ghost" label="APPLE" disabled={busy} onPress={() => run(() => signInWithProvider('apple'))} />
          </View>
        </>
      }
    >
      <View style={{ height: 40 }} />
      <T size={64} color={C.red}>HADES</T>
      <Title>LA SALLE. LA CUISINE. RIEN D'AUTRE.</Title>
      <Field label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="MOT DE PASSE (6+)" value={pw} onChangeText={setPw} />
      {!!error && <T size={13} color={C.red}>{error}</T>}
      {!valid && <T size={11} dim>EMAIL VALIDE + MOT DE PASSE 6 CARACTERES MINIMUM</T>}
      {!cloudEnabled && <T size={11} dim>MODE LOCAL : AUCUN SERVEUR CONFIGURE. DONNEES SUR CET APPAREIL UNIQUEMENT.</T>}
    </Screen>
  );
}
