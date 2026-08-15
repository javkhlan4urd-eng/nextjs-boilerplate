"use client";

import { OBSERVATION_FIELDS } from "@/types/database";
import type { ObservationFields } from "@/app/(app)/observations/actions";

export function emptyObservationFields(): ObservationFields {
  return {
    observed_fact: "",
    development_direction: "",
    child_performance: "",
    note: "",
    teacher_conclusion: "",
    next_action: "",
    methodology_note: "",
  };
}

export async function analyzeObservationPhoto(
  imageUrl: string,
  context: { domainName?: string; outcomeCode?: string; outcomeDescription?: string }
): Promise<ObservationFields> {
  const res = await fetch("/api/analyze-observation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, ...context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI дүн шинжилгээ амжилтгүй боллоо");
  return {
    observed_fact: data.observed_fact ?? "",
    development_direction: data.development_direction ?? "",
    child_performance: data.child_performance ?? "",
    note: data.note ?? "",
    teacher_conclusion: data.teacher_conclusion ?? "",
    next_action: data.next_action ?? "",
    methodology_note: data.methodology_note ?? "",
  };
}

export default function SevenFieldsEditor({
  value,
  onChange,
}: {
  value: ObservationFields;
  onChange: (v: ObservationFields) => void;
}) {
  return (
    <div className="mt-2 space-y-3">
      {OBSERVATION_FIELDS.map((f) => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-violet-700">
            {f.letter}. {f.label} <span className="font-normal text-slate-400">({f.hint})</span>
          </label>
          <textarea
            value={value[f.key]}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            rows={2}
            placeholder={f.placeholder}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      ))}
    </div>
  );
}
