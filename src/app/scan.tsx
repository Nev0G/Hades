import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, T } from '../components/ui';
import { fetchByBarcode } from '../lib/off';
import { first, save } from '../lib/db';
import { C } from '../lib/theme';

export default function Scan() {
  const router = useRouter();
  const { meal, date } = useLocalSearchParams<{ meal: string; date: string }>();
  const [perm, ask] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const onCode = async (code: string) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      let f = await first<{ id: string }>('SELECT id FROM foods WHERE barcode=? AND deleted=0', [code]);
      if (!f) {
        const off = await fetchByBarcode(code);
        if (!off) throw new Error('PRODUIT INTROUVABLE');
        const id = await save('foods', { ...off, custom: 0 });
        f = { id };
      }
      router.replace({ pathname: '/add-food', params: { meal, date, foodId: f.id } });
    } catch (e: any) {
      Alert.alert('SCAN', String(e.message ?? e).toUpperCase(), [{ text: 'OK', onPress: () => { locked.current = false; setBusy(false); } }]);
    }
  };

  if (!perm?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, justifyContent: 'flex-end', gap: 12 }}>
        <T size={22}>CAMERA REQUISE POUR SCANNER</T>
        <Btn label="AUTORISER" onPress={ask} />
        <Btn variant="ghost" label="RETOUR" onPress={() => router.back()} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => onCode(data)}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.center}>
          <View style={s.reticle}>
            {[s.tl, s.tr, s.bl, s.br].map((c, i) => <View key={i} style={[s.corner, c]} />)}
            <View style={s.hLine} /><View style={s.vLine} />
          </View>
          <T size={14} color={C.gold} style={{ marginTop: 16 }}>{busy ? 'CIBLE VERROUILLEE...' : 'CENTRER LE CODE-BARRES'}</T>
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        <Btn variant="ghost" label="ANNULER" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const L = 36, W = 5;
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 280, height: 180 },
  corner: { position: 'absolute', width: L, height: L, borderColor: C.red },
  tl: { top: 0, left: 0, borderTopWidth: W, borderLeftWidth: W },
  tr: { top: 0, right: 0, borderTopWidth: W, borderRightWidth: W },
  bl: { bottom: 0, left: 0, borderBottomWidth: W, borderLeftWidth: W },
  br: { bottom: 0, right: 0, borderBottomWidth: W, borderRightWidth: W },
  hLine: { position: 'absolute', top: 89, left: 100, right: 100, height: 2, backgroundColor: C.red },
  vLine: { position: 'absolute', left: 139, top: 60, bottom: 60, width: 2, backgroundColor: C.red },
});
