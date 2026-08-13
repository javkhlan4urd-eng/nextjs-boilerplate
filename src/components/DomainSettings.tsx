"use client";

import { useState } from "react";
import type { LearningDomain } from "@/types/database";
import {
  createDomain,
  updateDomainName,
  reorderDomain,
  deleteDomain,
} from "@/app/(app)/reports/actions";

export default function DomainSettings({ domains }: { domains: LearningDomain[] }) {
  const sorted = [...domains].sort((a, b) => a.sort_order - b.sort_order);

  async function swap(a: LearningDomain, b: LearningDomain) {
    const fd1 = new FormData();
    fd1.set("id", a.id);
    fd1.set("sort_order", String(b.sort_order));
    const fd2 = new FormData();
    fd2.set("id", b.id);
    fd2.set("sort_order", String(a.sort_order));
    await reorderDomain(fd1);
    await reorderDomain(fd2);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800">Суралцахуйн 7 чиглэл</h2>
      <p className="mt-1 text-xs text-slate-500">
        Нэрийг өөрчлөх, дарааллыг тохируулах, шинэ чиглэл нэмэх боломжтой.
      </p>

      <div className="mt-3 space-y-2">
        {sorted.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
            <span className="flex-1 text-sm text-slate-800">{d.name}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => swap(sorted[i], sorted[i - 1])}
                className="rounded-md px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={i === sorted.length - 1}
                onClick={() => swap(sorted[i], sorted[i + 1])}
                className="rounded-md px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ↓
              </button>
              <InlineEdit domain={d} />
              <form action={deleteDomain}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                  Устгах
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <form action={createDomain} className="mt-3 flex gap-2">
        <input
          name="name"
          placeholder="Шинэ чиглэлийн нэр"
          required
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white">
          + Нэмэх
        </button>
      </form>
    </div>
  );
}

function InlineEdit({ domain }: { domain: LearningDomain }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
        Засах
      </button>
    );
  }
  return (
    <form
      action={async (fd) => {
        await updateDomainName(fd);
        setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="id" value={domain.id} />
      <input
        name="name"
        defaultValue={domain.name}
        required
        autoFocus
        className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      <button type="submit" className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white">
        ✓
      </button>
      <button type="button" onClick={() => setEditing(false)} className="rounded-md px-1 text-xs text-slate-500">
        ✕
      </button>
    </form>
  );
}
