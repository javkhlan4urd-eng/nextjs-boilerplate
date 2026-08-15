export type Gender = "эрэгтэй" | "эмэгтэй";
export type MediaType = "image" | "video";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  teacher_id: string;
  name: string;
  school_year: string | null;
  level: 1 | 2 | 3 | 4 | null;
  created_at: string;
}

export interface Child {
  id: string;
  group_id: string;
  last_name: string | null;
  first_name: string;
  gender: Gender | null;
  birth_date: string | null;
  photo_url: string | null;
  father_name: string | null;
  father_phone: string | null;
  father_workplace: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  mother_workplace: string | null;
  home_address: string | null;
  notes: string | null;
  created_at: string;
}

export interface LearningDomain {
  id: string;
  teacher_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Observation {
  id: string;
  child_id: string;
  domain_id: string;
  teacher_id: string;
  observed_on: string;
  routine_period: string | null;
  level: 1 | 2 | 3 | 4 | null;
  observed_fact: string | null;
  development_direction: string | null;
  child_performance: string | null;
  note: string | null;
  teacher_conclusion: string | null;
  next_action: string | null;
  methodology_note: string | null;
  created_at: string;
}

export const ROUTINE_PERIODS = [
  "Өглөөний дасгалын цаг",
  "Тойргийн цаг",
  "Чиглүүлэгтэй тоглоом үйл ажиллагаа",
  "Төвийн үйл ажиллагаа",
  "Зугаалга",
  "Бусад",
] as const;

export const OBSERVATION_FIELDS: {
  key: "observed_fact" | "development_direction" | "child_performance" | "note" | "teacher_conclusion" | "next_action" | "methodology_note";
  letter: string;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "observed_fact",
    letter: "А",
    label: "Ажиглагдсан баримт",
    hint: "Юу хийж байгаа, ямар орчинд байгаа бодит байдал",
    placeholder: "Жишээ: Хүүхэд зургийн ширээнд суугаад өөрийн санаагаа цаасан дээр буулгаж эхлэв...",
  },
  {
    key: "development_direction",
    letter: "Б",
    label: "Хөгжлийн чиглэл",
    hint: "Энэ үйлдлээр ямар чадвар хөгжиж байгаа нь",
    placeholder: "Жишээ: Өөрийн бодол төсөөллөөр зохиомжлон дүрслэх чадвар, бүтээлч сэтгэлгээ...",
  },
  {
    key: "child_performance",
    letter: "В",
    label: "Хүүхдийн гүйцэтгэл",
    hint: "Зурсан байдал, өнгө дүрс, шугамын зохицол",
    placeholder: "Жишээ: Хуудасны төв хэсэгт гол обьект байрлуулж, тод өнгөөр ялган будсан...",
  },
  {
    key: "note",
    letter: "Г",
    label: "Ажиглалтын тэмдэглэл",
    hint: "Хүүхдийн өөрийн тайлбар, яриа",
    placeholder: "Жишээ: 'Энэ бол миний мөрөөдлийн сансрын хөлөг' гэж тайлбарлав...",
  },
  {
    key: "teacher_conclusion",
    letter: "Д",
    label: "Багшийн дүгнэлт",
    hint: "Тухайн ажиглалтаар ажиглагдсан түвшин",
    placeholder: "Жишээ: Санаагаа чөлөөтэй илэрхийлж, зохиомж гаргах чадвар сайн хөгжиж байна...",
  },
  {
    key: "next_action",
    letter: "Е",
    label: "Цаашдын үйл ажиллагаа",
    hint: "Багшийн үзүүлэх дэмжлэг",
    placeholder: "Жишээ: Илүү нарийн хээ болон өнгөний уусах уусгалтыг туршиж үзүүлэх...",
  },
  {
    key: "methodology_note",
    letter: "Ё",
    label: "Арга зүйн санал",
    hint: "Арга зүйд тусгах санаа",
    placeholder: "Жишээ: Бусад хүүхдүүдтэй туршлага солилцох боломж бүрдүүлэх...",
  },
];

export interface ObservationMedia {
  id: string;
  observation_id: string;
  file_url: string;
  media_type: MediaType;
  created_at: string;
}

export interface FitnessTest {
  id: string;
  child_id: string;
  teacher_id: string;
  tested_on: string;
  age_group: 3 | 4 | 5;
  gender: Gender;
  speed_sec: number | null;
  speed_score: 1 | 2 | 3 | null;
  strength_value: number | null;
  strength_score: 1 | 2 | 3 | null;
  agility_value: number | null;
  agility_score: 1 | 2 | 3 | null;
  balance_sec: number | null;
  balance_score: 1 | 2 | 3 | null;
  total_score: number | null;
  level: string | null;
  note: string | null;
  created_at: string;
}

export const LEVEL_LABELS: Record<number, string> = {
  1: "Эхэлж байгаа",
  2: "Хөгжиж байгаа",
  3: "Хангасан",
  4: "Бүрэн эзэмшсэн",
};
