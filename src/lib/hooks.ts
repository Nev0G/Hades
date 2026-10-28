import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Recharge une requête locale à chaque retour sur l'écran. */
export function useLoad<T>(fn: () => Promise<T>, deps: any[] = []): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(() => {
    fn().then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useFocusEffect(load);
  return [data, load];
}
