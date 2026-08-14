"use client";

import { useMemo, useState } from "react";
import {
  type AgeGroup,
  type Gender,
  ageGroupFromBirthDate,
  getTestDefs,
  scoreValue,
  levelFromTotal,
  LEVEL_LABELS,
} from "@/lib/fitnessCriteria";

interface ChildOption {
  id: string;
  label: string;
  birthDate: string | null;
  gender: Gender | null;
}

export default function FitnessForm({
  action,
  childOptions,
  defaultChildId,
}: {
  action: (formData: FormData) => void;
  childOptions: ChildOption[];
  defaultChildId?: string;
}) {
  const [childId, setChildId] = useState(defaultChildId ?? "");
  const [testedOn, setTestedOn] = useState(new Date().toISOString().slice(0, 10));
  const selectedChild = childOptions.find((c) => c.id === childId);

  const [ageGroup, setAgeGroup] = useState<AgeGroup>(
    (selectedChild && ageGroupFromBirthDate(selectedChild.birthDate, testedOn)) || 4
  );
  const [gender, setGender] = useState<Gender>(selectedChild?.gender ?? "эрэгтэй");

  function onChildChange(id: string) {
    setChildId(id);
    const c = childOptions.find((c) => c.id === id);
    if (c) {
      const ag = ageGroupFromBirthDate(c.birthDate, testedOn);
      if (ag) setAgeGroup(ag);
      if (c.gender) setGender(c.gender);
    }
  }

  const defs = useMemo(() => getTestDefs(ageGroup, gender), [ageGroup, gender]);

  const [values, setValues] = useState<Record<string, string>>({});

  const scores = defs.map((d) => {
    const raw = values[d.key];
    const num = raw === undefined || raw === "" ? null : parseFloat(raw);
    const score = num !== null && !Number.isNaN(num) ? scoreValue(d, num) : null;
    return { def: d, score };
  });

  const allFilled = scores.every((s) => s.score !== null);
  const total = allFilled ? scores.reduce((sum, s) => sum + (s.score ?? 0), 0) : null;

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700">Хүүхэд</label>
        <select
          name="child_id"
          required
          value={childId}
          onChange={(e) => onChildChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">-- Сонгох --</option>
          {childOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Огноо</label>
          <input
            type="date"
            name="tested_on"
            required
            value={testedOn}
            onChange={(e) => setTestedOn(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Насны анги</label>
          <select
            name="age_group"
            required
            value={ageGroup}
            onChange={(e) => setAgeGroup(Number(e.target.value) as AgeGroup)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={3}>3 нас</option>
            <option value={4}>4 нас</option>
            <option value={5}>5 нас</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Хүйс</label>
          <select
            name="gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="эрэгтэй">Эрэгтэй</option>
            <option value="эмэгтэй">Эмэгтэй</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {scores.map(({ def, score }) => (
          <div key={def.key} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {def.label} <span className="font-normal text-slate-500">— {def.gameName}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Маш сайн: {def.high} · Хангалттай: {def.ok} · Дэмжлэг хэрэгтэй: {def.support} ({def.unit})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  required
                  name={`${def.key}_value`}
                  value={values[def.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [def.key]: e.target.value }))}
                  placeholder={def.unit}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {score !== null && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      score === 3
                        ? "bg-emerald-100 text-emerald-700"
                        : score === 2
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {score === 3 ? LEVEL_LABELS.high : score === 2 ? LEVEL_LABELS.ok : LEVEL_LABELS.support}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {total !== null && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm">
          <span className="font-semibold text-indigo-900">Нийт оноо: {total}/12</span>
          <span className="ml-2 text-indigo-700">— {levelFromTotal(total)}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Тэмдэглэл</label>
        <textarea
          name="note"
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Нэмэлт тэмдэглэл (заавал биш)"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:opacity-95 sm:w-auto sm:px-6"
      >
        Хадгалах
      </button>
    </form>
  );
}
