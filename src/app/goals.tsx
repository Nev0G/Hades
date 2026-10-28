import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Chips, Screen, T, Title } from '../components/ui';
import { NumForm } from '../components/NumForm';
import { NumPad } from '../components/NumPad';
import { getProfile, resetTargets, saveProfile, saveTargets } from '../lib/repo';
import { getGoals, setGoals, balanceCarbs, macroKcal, splitFromPercent } from '../lib/goals';
import { toNumber } from '../lib/numpad';
import { Activity, Goal, Sex } from '../lib/nutrition';
import { C } from '../lib/theme';

const GOALS: Goal[] = ['MASSE', 'SECHE', 'MAINTIEN'];
const ACTS: Activity[] = ['SEDENTAIRE', 'LEGER', 'MODERE', 'INTENSE', 'EXTREME'];
const PRESETS: [string, { p: number; c: number; f: number }][] = [['30 / 40 / 30', { p: 30, c: 40, f: 30 }], ['25 / 50 / 25', { p: 25, c: 50, f: 25 }], ['40 / 30 / 30', { p: 40, c: 30, f: 30 }], ['35 / 25 / 40 (low carb)', { p: 35, c: 25, f: 40 }]];

/** Tous les objectifs modifiables : calories, macros, profil corporel, eau, séances, poids cible. */
export default function GoalsScreen() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [custom, setCustom] = useState(false);
  const [t, setT] = useState<Record<string, string>>({});
  const [body, setBody] = useState<Record<string, string>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [sex, setSex] = useState<Sex>('M');
  const [goal, setGoal] = useState<Goal>('MAINTIEN');
  const [activity, setActivity] = useState<Activity>('MODERE');
  const [tdee, setTdee] = useState(0);
  const [msg, setMsg] = useState('');
  const [act, setAct] = useState<{ g: 't' | 'body' | 'other'; k: string } | null>({ g: 't', k: 'kcal' });

  const load = async () => {
    const p = await getProfile();
    const g = await getGoals();
    if (!p) return;
    setT({ kcal: String(p.kcal), p: String(p.protein), c: String(p.carbs), f: String(p.fat) });
    setBody({ weight: String(p.weight_kg), height: String(p.height_cm), age: String(p.age) });
    setOther({ water: String(g.water), sessions: String(g.sessionsPerWeek), target: g.targetWeight ? String(g.targetWeight) : '' });
    setSex(p.sex); setGoal(p.goal); setActivity(p.activity); setCustom(!!p.custom_targets); setTdee(p.tdee);
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);
  if (!loaded) return <Screen><T>...</T></Screen>;

  const kcal = toNumber(t.kcal), p = toNumber(t.p), c = toNumber(t.c), f = toNumber(t.f);
  const total = macroKcal(p, c, f);
  const gap = total - kcal;
  const editT = (v: Record<string, string>) => { setT(v); setCustom(true); };

  const save = async () => {
    const profile = { sex, age: toNumber(body.age), height_cm: toNumber(body.height), weight_kg: toNumber(body.weight), goal, activity };
    await saveProfile(profile);
    if (custom) await saveTargets({ kcal, protein: p, carbs: c, fat: f });
    await setGoals({ water: toNumber(other.water) || 8, sessionsPerWeek: toNumber(other.sessions) || 3, targetWeight: toNumber(other.target) || null });
    setMsg('Objectifs enregistrés');
    await load();
  };

  return (
    <Screen footer={<>
      {act && <NumPad value={(act.g === 't' ? t : act.g === 'body' ? body : other)[act.k] ?? ''} onChange={(v) => {
        if (act.g === 't') editT({ ...t, [act.k]: v }); else if (act.g === 'body') setBody({ ...body, [act.k]: v }); else setOther({ ...other, [act.k]: v });
      }} />}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn style={{ flex: 2 }} label="Enregistrer" onPress={save} />
        <Btn style={{ flex: 1 }} variant="ghost" label="Retour" onPress={() => router.back()} />
      </View>
    </>}>
      <Title>Mes objectifs</Title>
      {msg ? <T size={14} color={C.green}>{msg}</T> : null}

      <Card>
        <T size={18}>Calories et macros</T>
        <T size={13} dim>{custom ? 'Valeurs personnalisées' : 'Calcul automatique (TDEE + objectif)'}{tdee ? ` · TDEE ${tdee} kcal` : ''}</T>
        <NumForm fields={[{ key: 'kcal', label: 'Calories', unit: 'kcal' }, { key: 'p', label: 'Protéines', unit: 'g' }, { key: 'c', label: 'Glucides', unit: 'g' }, { key: 'f', label: 'Lipides', unit: 'g' }]} values={t} onChange={editT} activeKey={act?.g === 't' ? act.k : null} onActivate={(k) => setAct({ g: 't', k })} />
        <T size={13} color={Math.abs(gap) <= 25 ? C.green : C.orange}>Macros = {total} kcal ({gap >= 0 ? '+' : ''}{gap} vs objectif)</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn style={{ flex: 1 }} size="sm" variant="ghost" label="Équilibrer les glucides" onPress={() => editT({ ...t, c: String(balanceCarbs(kcal, p, f)) })} />
          <Btn style={{ flex: 1 }} size="sm" variant="ghost" label="Kcal = macros" onPress={() => editT({ ...t, kcal: String(total) })} />
        </View>
        <T size={12} dim>Répartition rapide (protéines / glucides / lipides, en % des calories)</T>
        <View style={{ gap: 6 }}>
          {PRESETS.map(([label, pct]) => (
            <Btn key={label} size="sm" variant="ghost" label={label} onPress={() => { const s = splitFromPercent(kcal, pct); editT({ ...t, p: String(s.protein), c: String(s.carbs), f: String(s.fat) }); }} />
          ))}
        </View>
        {custom && <Btn size="sm" variant="orange" label="Revenir au calcul automatique" onPress={async () => { await resetTargets(); setMsg('Calcul automatique rétabli'); await load(); }} />}
      </Card>

      <Card>
        <T size={18}>Profil et objectif corporel</T>
        <T size={12} dim>Objectif</T>
        <Chips options={GOALS} value={goal} onChange={setGoal} color={C.orange} />
        <T size={12} dim>Niveau d'activité</T>
        <Chips options={ACTS} value={activity} onChange={setActivity} color={C.orange} />
        <T size={12} dim>Sexe</T>
        <Chips options={['M', 'F'] as const} value={sex} onChange={setSex} />
        <NumForm fields={[{ key: 'weight', label: 'Poids', unit: 'kg' }, { key: 'height', label: 'Taille', unit: 'cm' }, { key: 'age', label: 'Âge', unit: 'ans' }]} values={body} onChange={setBody} activeKey={act?.g === 'body' ? act.k : null} onActivate={(k) => setAct({ g: 'body', k })} />
        {!custom && <T size={12} dim>Les calories et macros se recalculent automatiquement avec ces valeurs.</T>}
      </Card>

      <Card>
        <T size={18}>Autres objectifs</T>
        <NumForm fields={[{ key: 'water', label: 'Eau / jour', unit: 'verres' }, { key: 'sessions', label: 'Séances / semaine' }, { key: 'target', label: 'Poids cible', unit: 'kg' }]} values={other} onChange={setOther} activeKey={act?.g === 'other' ? act.k : null} onActivate={(k) => setAct({ g: 'other', k })} />
      </Card>
    </Screen>
  );
}
