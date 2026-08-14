"use client";

import { useState, useTransition } from "react";
import { toggleReadinessCheck } from "@/app/(app)/assessment/result/actions";
import { CATEGORY_ORDER, readinessVerdict, verdictStyle } from "@/lib/readiness";

interface Criterion {
  id: string;
  category: string;
  number: number;
  description: string;
}

export default function ReadinessChecklist({
  childId,
  criteria,
  initialAchieved,
}: {
  childId: string;
  criteria: Criterion[];
  initialAchieved: Record<string, boolean>;
}) {
  const [achieved, setAchieved] = useState<Record<string, boolean>>(initialAchieved);
  const [, startTransition] = useTransition();

  const total = criteria.length;
  const achievedCount = criteria.filter((c) => achieved[c.id]).length;
  const pct = total > 0 ? Math.round((achievedCount / total) * 100) : 0;
  const verdict = readinessVerdict(pct);
  const vs = verdictStyle(verdict);

  function toggle(criterionId: string) {
    const next = !achieved[criterionId];
    setAchieved((prev) => ({ ...prev, [criterionId]: next }));
    startTransition(() => {
      toggleReadinessCheck(childId, criterionId, next).catch(() => {
        setAchieved((prev) => ({ ...prev, [criterionId]: !next }));
      });
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${vs.bg} ${vs.text}`}>
          {verdict}
        </span>
        <span className="text-sm text-slate-600">
          {achievedCount}/{total} шалгуур эзэмшсэн ({pct}%)
        </span>
      </div>

      <div className="mt-4 space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = criteria.filter((c) => c.category === cat).sort((a, b) => a.number - b.number);
          if (items.length === 0) return null;
          const catAchieved = items.filter((c) => achieved[c.id]).length;
          return (
            <div key={cat} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{cat}</h3>
                <span className="text-xs text-slate-500">
                  {catAchieved}/{items.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {items.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={!!achieved[c.id]}
                        onChange={() => toggle(c.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">
                        <span className="text-slate-400">{c.number}.</span> {c.description}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
