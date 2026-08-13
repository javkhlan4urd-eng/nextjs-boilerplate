"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChildForm from "./ChildForm";
import type { Child } from "@/types/database";
import { updateChild, deleteChild } from "@/app/(app)/children/actions";

function calcAge(birthDate: string | null) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} нас ${months} сар`;
}

const INFO_ROWS: { key: keyof Child; label: string }[] = [
  { key: "father_name", label: "Эцгийн нэр" },
  { key: "father_phone", label: "Эцгийн утас" },
  { key: "father_workplace", label: "Эцгийн ажлын газар" },
  { key: "mother_name", label: "Эхийн нэр" },
  { key: "mother_phone", label: "Эхийн утас" },
  { key: "mother_workplace", label: "Эхийн ажлын газар" },
  { key: "home_address", label: "Гэрийн хаяг" },
  { key: "notes", label: "Тэмдэглэл" },
];

export default function ChildDetail({ child }: { child: Child }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  if (editing) {
    return (
      <ChildForm
        action={async (fd) => {
          await updateChild(fd);
          setEditing(false);
        }}
        defaultValues={child}
        groupId={child.group_id}
        submitLabel="Хадгалах"
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {child.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={child.photo_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-400 text-xl font-semibold text-white shadow-sm">
              {child.first_name?.[0] ?? "?"}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {child.last_name ? `${child.last_name} ` : ""}
              {child.first_name}
            </h1>
            <p className="text-sm text-slate-500">
              {child.gender ?? ""}
              {child.birth_date ? ` · ${child.birth_date} (${calcAge(child.birth_date)})` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Засах
          </button>
          <form
            action={async (fd) => {
              if (confirm(`${child.first_name}-г устгах уу? Бүх ажиглалт устана.`)) {
                await deleteChild(fd);
                router.push("/children");
              }
            }}
          >
            <input type="hidden" name="id" value={child.id} />
            <input type="hidden" name="group_id" value={child.group_id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Устгах
            </button>
          </form>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        {INFO_ROWS.map(({ key, label }) =>
          child[key] ? (
            <div key={key}>
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="text-sm text-slate-800">{String(child[key])}</dd>
            </div>
          ) : null
        )}
      </dl>
    </div>
  );
}
