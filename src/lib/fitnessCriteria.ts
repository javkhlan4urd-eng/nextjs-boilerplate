export type AgeGroup = 3 | 4 | 5;
export type Gender = "эрэгтэй" | "эмэгтэй";
export type FitnessScore = 1 | 2 | 3;

export const LEVEL_LABELS = {
  high: "Маш сайн",
  ok: "Хангалттай",
  support: "Дэмжлэг хэрэгтэй",
} as const;

interface TestDef {
  key: "speed" | "strength" | "agility" | "balance";
  label: string;
  gameName: string;
  unit: string;
  higherIsBetter: boolean;
  high: string;
  ok: string;
  support: string;
  thresholds: { high: number; ok: number };
}

function byAgeGender(
  age: AgeGroup,
  gender: Gender
): Record<TestDef["key"], TestDef> {
  const table: Record<string, Record<Gender, Record<TestDef["key"], TestDef>>> = {
    3: {
      эрэгтэй: {
        speed: { key: "speed", label: "Хурд", gameName: "Хэн хурдан вэ?", unit: "сек", higherIsBetter: false, high: "3.9 - доош", ok: "4.0 - 5.0", support: "5.1 - дээш", thresholds: { high: 3.9, ok: 5.0 } },
        strength: { key: "strength", label: "Хүч", gameName: "Туулай шиг үсрэе", unit: "тоо", higherIsBetter: true, high: "4-5", ok: "2-3", support: "1", thresholds: { high: 4, ok: 2 } },
        agility: { key: "agility", label: "Авхаалж самбаа", gameName: "Бөмбөг цуглуулах", unit: "тоо", higherIsBetter: true, high: "4-5", ok: "2-3", support: "1", thresholds: { high: 4, ok: 2 } },
        balance: { key: "balance", label: "Тэнцвэр", gameName: "Дэглий", unit: "сек", higherIsBetter: true, high: "10 - дээш", ok: "4-9", support: "1-3", thresholds: { high: 10, ok: 4 } },
      },
      эмэгтэй: {
        speed: { key: "speed", label: "Хурд", gameName: "Хэн хурдан вэ?", unit: "сек", higherIsBetter: false, high: "4.2 - доош", ok: "4.3 - 5.3", support: "5.4 - дээш", thresholds: { high: 4.2, ok: 5.3 } },
        strength: { key: "strength", label: "Хүч", gameName: "Туулай шиг үсрэе", unit: "тоо", higherIsBetter: true, high: "4-5", ok: "2-3", support: "1", thresholds: { high: 4, ok: 2 } },
        agility: { key: "agility", label: "Авхаалж самбаа", gameName: "Бөмбөг цуглуулах", unit: "тоо", higherIsBetter: true, high: "4-5", ok: "2-3", support: "1", thresholds: { high: 4, ok: 2 } },
        balance: { key: "balance", label: "Тэнцвэр", gameName: "Дэглий шувуу", unit: "сек", higherIsBetter: true, high: "10 - дээш", ok: "4-9", support: "1-3", thresholds: { high: 10, ok: 4 } },
      },
    },
    4: {
      эрэгтэй: {
        speed: { key: "speed", label: "Хурд", gameName: "Хэн хурдан вэ?", unit: "сек", higherIsBetter: false, high: "3.4 - доош", ok: "3.5 - 4.5", support: "4.6 - дээш", thresholds: { high: 3.4, ok: 4.5 } },
        strength: { key: "strength", label: "Хүч", gameName: "Туулай шиг үсрэе", unit: "тоо", higherIsBetter: true, high: "7-10", ok: "3-6", support: "1-2", thresholds: { high: 7, ok: 3 } },
        balance: { key: "balance", label: "Тэнцвэр", gameName: "Тогоруу", unit: "сек", higherIsBetter: true, high: "7 - дээш", ok: "4-6", support: "1-3", thresholds: { high: 7, ok: 4 } },
        agility: { key: "agility", label: "Авхаалж самбаа", gameName: "Сагсчин", unit: "тоо", higherIsBetter: true, high: "3 - дээш", ok: "2", support: "1", thresholds: { high: 3, ok: 2 } },
      },
      эмэгтэй: {
        speed: { key: "speed", label: "Хурд", gameName: "Хэн хурдан вэ?", unit: "сек", higherIsBetter: false, high: "3.7 - доош", ok: "3.8 - 4.8", support: "4.9 - дээш", thresholds: { high: 3.7, ok: 4.8 } },
        strength: { key: "strength", label: "Хүч", gameName: "Туулай шиг үсрэе", unit: "тоо", higherIsBetter: true, high: "7-10", ok: "3-6", support: "1-2", thresholds: { high: 7, ok: 3 } },
        balance: { key: "balance", label: "Тэнцвэр", gameName: "Тогоруу", unit: "сек", higherIsBetter: true, high: "7 - дээш", ok: "4-6", support: "1-3", thresholds: { high: 7, ok: 4 } },
        agility: { key: "agility", label: "Авхаалж самбаа", gameName: "Сагсчин", unit: "тоо", higherIsBetter: true, high: "3 - дээш", ok: "2", support: "1", thresholds: { high: 3, ok: 2 } },
      },
    },
    5: {
      эрэгтэй: {
        speed: { key: "speed", label: "Хурд", gameName: "Хэн хурдан вэ?", unit: "сек", higherIsBetter: false, high: "2.9 - доош", ok: "3.0 - 4.0", support: "4.1 - дээш", thresholds: { high: 2.9, ok: 4.0 } },
        strength: { key: "strength", label: "Хүч", gameName: "Горхи дээгүүр харайх", unit: "см", higherIsBetter: true, high: "101 - дээш", ok: "61-100", support: "60 - доош", thresholds: { high: 101, ok: 61 } },
        balance: { key: "balance", label: "Тэнцвэр", gameName: "Хөшөө", unit: "сек", higherIsBetter: true, high: "10 - дээш", ok: "4-9", support: "1-3", thresholds: { high: 10, ok: 4 } },
        agility: { key: "agility", label: "Авхаалж самбаа", gameName: "Сагсчин", unit: "тоо", higherIsBetter: true, high: "3 - дээш", ok: "2", support: "1", thresholds: { high: 3, ok: 2 } },
      },
      эмэгтэй: {
        speed: { key: "speed", label: "Хурд", gameName: "Хэн хурдан вэ?", unit: "сек", higherIsBetter: false, high: "3.2 - доош", ok: "3.3 - 4.3", support: "4.4 - дээш", thresholds: { high: 3.2, ok: 4.3 } },
        strength: { key: "strength", label: "Хүч", gameName: "Гол дээгүүр харайх", unit: "см", higherIsBetter: true, high: "91 - дээш", ok: "61-90", support: "60 - доош", thresholds: { high: 91, ok: 61 } },
        balance: { key: "balance", label: "Тэнцвэр", gameName: "Хөшөө", unit: "сек", higherIsBetter: true, high: "10 - дээш", ok: "4-9", support: "1-3", thresholds: { high: 10, ok: 4 } },
        agility: { key: "agility", label: "Авхаалж самбаа", gameName: "Сагсчин", unit: "тоо", higherIsBetter: true, high: "3 - дээш", ok: "2", support: "1", thresholds: { high: 3, ok: 2 } },
      },
    },
  };
  return table[age][gender];
}

export function getTestDefs(age: AgeGroup, gender: Gender): TestDef[] {
  const defs = byAgeGender(age, gender);
  return [defs.speed, defs.strength, defs.agility, defs.balance];
}

export function scoreValue(def: TestDef, value: number): FitnessScore {
  if (def.higherIsBetter) {
    if (value >= def.thresholds.high) return 3;
    if (value >= def.thresholds.ok) return 2;
    return 1;
  } else {
    if (value <= def.thresholds.high) return 3;
    if (value <= def.thresholds.ok) return 2;
    return 1;
  }
}

export function levelFromTotal(total: number): string {
  if (total >= 10) return LEVEL_LABELS.high;
  if (total >= 7) return LEVEL_LABELS.ok;
  return LEVEL_LABELS.support;
}

export function ageGroupFromBirthDate(birthDate: string | null, onDate: string): AgeGroup | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const d = new Date(onDate);
  let years = d.getFullYear() - b.getFullYear();
  const monthDiff = d.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && d.getDate() < b.getDate())) years -= 1;
  if (years <= 3) return 3;
  if (years === 4) return 4;
  return 5;
}
