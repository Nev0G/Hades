import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Chips, Screen, T, Title } from '../components/ui';
import { NumPad } from '../components/NumPad';
import { toNumber } from '../lib/numpad';
import { Activity, computeTargets, Goal, Sex } from '../lib/nutrition';
import { saveProfile } from '../lib/repo';
import { C } from '../lib/theme';

type Step = 'sex' | 'age' | 'height' | 'weight' | 'goal' | 'activity' | 'result';
const ORDER: Step[] = ['sex', 'age', 'height', 'weight', 'goal', 'activity', 'result'];
const GOALS: Goal[] = ['MASSE', 'SECHE', 'MAINTIEN'];
const ACTS: Activity[] = ['SEDENTAIRE', 'LEGER', 'MODERE', 'INTENSE', 'EXTREME'];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('sex');
  const [sex, setSex] = useState<Sex>('M');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<Goal>('MAINTIEN');
  const [activity, setActivity] = useState<Activity>('MODERE');

  const i = ORDER.indexOf(step);
  const numeric = step === 'age' || step === 'height' || step === 'weight';
  const val = step === 'age' ? age : step === 'height' ? height : weight;
  const setVal = step === 'age' ? setAge : step === 'height' ? setHeight : setWeight;
  const unit = step === 'age' ? 'ANS' : step === 'height' ? 'CM' : 'KG';
  const ok = !numeric || toNumber(val) > 0;

  const targets =
    step === 'result'
      ? computeTargets({ sex, age: toNumber(age), heightCm: toNumber(height), weightKg: toNumber(weight), goal, activity })
      : null;

  const next = async () => {
    if (step === 'result') {
      await saveProfile({ sex, age: toNumber(age), height_cm: toNumber(height), weight_kg: toNumber(weight), goal, activity });
      router.replace('/(tabs)');
    } else setStep(ORDER[i + 1]);
  };

  return (
    <Screen
      scroll={false}
      footer={
        <>
          {numeric && <NumPad value={val} onChange={setVal} />}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {i > 0 && <Btn variant="ghost" label="<" style={{ width: 72 }} onPress={() => setStep(ORDER[i - 1])} />}
            <Btn style={{ flex: 1 }} label={step === 'result' ? 'ENTRER' : 'SUIVANT'} disabled={!ok} onPress={next} />
          </View>
        </>
      }
    >
      <T size={12} dim>ETAPE {i + 1} / {ORDER.length}</T>
      {step === 'sex' && (<><Title>SEXE</Title><Chips options={['M', 'F'] as const} value={sex} onChange={setSex} /></>)}
      {numeric && (
        <>
          <Title>{step === 'age' ? 'AGE' : step === 'height' ? 'TAILLE' : 'POIDS ACTUEL'}</Title>
          <Card><T size={56} color={C.gold}>{val || '0'} <T size={20} dim>{unit}</T></T></Card>
        </>
      )}
      {step === 'goal' && (<><Title>OBJECTIF</Title><Chips options={GOALS} value={goal} onChange={setGoal} color={C.orange} /></>)}
      {step === 'activity' && (<><Title>NIVEAU D'ACTIVITE</Title><Chips options={ACTS} value={activity} onChange={setActivity} color={C.orange} /></>)}
      {targets && (
        <>
          <Title>TES CHIFFRES</Title>
          <Card accent={C.red}>
            <T size={12} dim>TDEE (MAINTIEN)</T><T size={32}>{targets.tdee} KCAL</T>
            <T size={12} dim>OBJECTIF {goal}</T><T size={40} color={C.gold}>{targets.kcal} KCAL</T>
          </Card>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Card style={{ flex: 1 }}><T size={11} dim>PROT</T><T size={22} color={C.red}>{targets.protein}G</T></Card>
            <Card style={{ flex: 1 }}><T size={11} dim>GLUC</T><T size={22} color={C.orange}>{targets.carbs}G</T></Card>
            <Card style={{ flex: 1 }}><T size={11} dim>LIP</T><T size={22} color={C.gold}>{targets.fat}G</T></Card>
          </View>
        </>
      )}
    </Screen>
  );
}
