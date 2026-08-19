"use client";

import { useState } from "react";
import Link from "next/link";
import type { Group } from "@/types/database";
import { updateGroup, deleteGroup } from "@/app/(app)/groups/actions";
import { GROUP_LEVEL_LABELS } from "@/lib/readiness";
import { groupTheme } from "@/lib/colors";

export default function GroupRow({
  group,
  childCount,
  colorful = false,
}: {
  group: Group;
  childCount: number;
  colorful?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const theme = groupTheme(group.level);

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateGroup(fd);
          setEditing(false);
        }}
        className={`flex flex-wrap items-center gap-2 rounded-xl border p-4 ${
          colorful ? `border-transparent ring-2 ${theme.ring} ${theme.chip}` : "border-indigo-200 bg-indigo-50/50"
        }`}
      >
        <input type="hidden" name="id" value={group.id} />
        <input
          name="name"
          defaultValue={group.name}
          required
          className="min-w-[10rem] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <input
          name="school_year"
          defaultValue={group.school_year ?? ""}
          placeholder="Хичээлийн жил, ж: 2025-2026"
          className="w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          name="level"
          defaultValue={group.level ?? ""}
          className="w-52 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">-- Насны түвшин --</option>
          {Object.entries(GROUP_LEVEL_LABELS).map(([lv, label]) => (
            <option key={lv} value={lv}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Хадгалах
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Болих
        </button>
      </form>
    );
  }

  if (colorful) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className={`h-2 w-full bg-gradient-to-r ${theme.from} ${theme.to}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/children?group=${group.id}`} className="flex items-center gap-2.5">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} text-xl shadow-sm`}
              >
                {theme.emoji}
              </span>
              <span className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
                {group.name}
              </span>
            </Link>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${theme.chip}`}>
              {childCount} хүүхэд
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {group.school_year ? `${group.school_year} · ` : ""}
            {group.level ? GROUP_LEVEL_LABELS[group.level].split(" — ")[1] : "Насны түвшин тохируулаагүй"}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/children?group=${group.id}`}
              className={`flex-1 rounded-lg bg-gradient-to-r ${theme.from} ${theme.to} px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:opacity-90`}
            >
              Хүүхдүүдийг харах →
            </Link>
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              title="Засах"
            >
              ✏️
            </button>
            <form
              action={async (fd) => {
                if (confirm(`"${group.name}" бүлгийг устгах уу? Бүх хүүхэд, ажиглалт устана.`)) {
                  await deleteGroup(fd);
                }
              }}
            >
              <input type="hidden" name="id" value={group.id} />
              <button type="submit" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Устгах">
                🗑️
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <div>
        <Link
          href={`/children?group=${group.id}`}
          className="font-medium text-slate-900 hover:text-indigo-700"
        >
          {group.name}
        </Link>
        <p className="text-sm text-slate-500">
          {group.school_year ? `${group.school_year} · ` : ""}
          {group.level ? `${GROUP_LEVEL_LABELS[group.level].split(" — ")[1]} · ` : ""}
          {childCount} хүүхэдтэй
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/children?group=${group.id}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Хүүхдүүд
        </Link>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Засах
        </button>
        <form
          action={async (fd) => {
            if (confirm(`"${group.name}" бүлгийг устгах уу? Бүх хүүхэд, ажиглалт устана.`)) {
              await deleteGroup(fd);
            }
          }}
        >
          <input type="hidden" name="id" value={group.id} />
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Устгах
          </button>
        </form>
      </div>
    </div>
  );
}
