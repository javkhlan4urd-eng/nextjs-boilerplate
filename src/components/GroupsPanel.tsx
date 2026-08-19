"use client";

import { useState } from "react";
import { createGroup } from "@/app/(app)/groups/actions";
import GroupRow from "@/components/GroupRow";
import { GROUP_LEVEL_LABELS } from "@/lib/readiness";
import type { Group } from "@/types/database";

export default function GroupsPanel({
  groups,
  childCount,
}: {
  groups: Group[];
  childCount: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
      >
        <span>🗂 Бүлгүүд удирдах ({groups.length})</span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 p-4">
          <form
            action={createGroup}
            className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="min-w-[10rem] flex-1">
              <label className="block text-xs font-medium text-slate-500">Бүлгийн нэр</label>
              <input
                name="name"
                required
                placeholder="Ж: Наран бүлэг"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-slate-500">Хичээлийн жил</label>
              <input
                name="school_year"
                placeholder="2025-2026"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="w-52">
              <label className="block text-xs font-medium text-slate-500">Насны түвшин</label>
              <select
                name="level"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">-- Сонгох --</option>
                {Object.entries(GROUP_LEVEL_LABELS).map(([lv, label]) => (
                  <option key={lv} value={lv}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95"
            >
              + Бүлэг үүсгэх
            </button>
          </form>

          <div className="space-y-2">
            {groups.length > 0 ? (
              groups.map((g) => (
                <GroupRow key={g.id} group={g} childCount={childCount[g.id] ?? 0} />
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Одоогоор бүлэг үүсгээгүй байна. Дээрх маягтаар эхний бүлгээ үүсгэнэ үү.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
