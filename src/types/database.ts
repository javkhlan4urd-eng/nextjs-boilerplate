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
  level: 1 | 2 | 3 | 4;
  note: string | null;
  created_at: string;
}

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
