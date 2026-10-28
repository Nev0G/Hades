import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Field, Screen, T, Title } from '../components/ui';
import { cloudEnabled, signIn, signInWithProvider, signUp } from '../lib/auth';
import { C } from '../lib/theme';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert('ERREUR', String(e.message ?? e).toUpperCase());
    } finally {
      setBusy(false);
    }
  };
  const valid = /.+@.+\..+/.test(email) && pw.length >= 6;

  return (
    <Screen
      footer={
        <>
          <Btn label="CONNEXION" disabled={!valid || busy} onPress={() => run(() => signIn(email, pw))} />
          <Btn label="CREER UN COMPTE" variant="gold" disabled={!valid || busy} onPress={() => run(() => signUp(email, pw))} />
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
      {!cloudEnabled && <T size={11} dim>MODE LOCAL : AUCUN SERVEUR CONFIGURE. DONNEES SUR CET APPAREIL UNIQUEMENT.</T>}
    </Screen>
  );
}
