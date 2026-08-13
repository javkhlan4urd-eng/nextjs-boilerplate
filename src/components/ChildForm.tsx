"use client";

import { useState } from "react";
import PhotoCapture, { type UploadedFile } from "./PhotoCapture";
import type { Child } from "@/types/database";

interface Props {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Child>;
  groupId?: string;
  groups?: { id: string; name: string }[];
  submitLabel: string;
  onCancel?: () => void;
}

export default function ChildForm({
  action,
  defaultValues,
  groupId,
  groups,
  submitLabel,
  onCancel,
}: Props) {
  const [photo, setPhoto] = useState<UploadedFile[]>(
    defaultValues?.photo_url ? [{ url: defaultValues.photo_url, type: "image" }] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tempFolder = defaultValues?.id ? `${defaultValues.id}` : `new-${crypto.randomUUID()}`;

  return (
    <form
      action={async (fd) => {
        setError(null);
        setSubmitting(true);
        try {
          await action(fd);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Алдаа гарлаа");
        }
        setSubmitting(false);
      }}
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
    >
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}
      <input type="hidden" name="photo_url" value={photo[0]?.url ?? ""} />

      <div>
        <label className="block text-xs font-medium text-slate-500">Зураг</label>
        <div className="mt-1">
          <PhotoCapture
            bucket="child-photos"
            folder={`children/${tempFolder}`}
            multiple={false}
            initial={photo}
            onChange={setPhoto}
          />
        </div>
      </div>

      {groups && !groupId && (
        <div>
          <label className="block text-xs font-medium text-slate-500">Бүлэг</label>
          <select
            name="group_id"
            required
            defaultValue={defaultValues?.group_id ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Сонгоно уу
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {groupId && <input type="hidden" name="group_id" value={groupId} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">Овог</label>
          <input
            name="last_name"
            defaultValue={defaultValues?.last_name ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Нэр <span className="text-red-500">*</span>
          </label>
          <input
            name="first_name"
            required
            defaultValue={defaultValues?.first_name ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Хүйс</label>
          <select
            name="gender"
            defaultValue={defaultValues?.gender ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="эрэгтэй">Эрэгтэй</option>
            <option value="эмэгтэй">Эмэгтэй</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Төрсөн огноо</label>
          <input
            type="date"
            name="birth_date"
            defaultValue={defaultValues?.birth_date ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700">Эцгийн мэдээлэл</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Нэр</label>
            <input
              name="father_name"
              defaultValue={defaultValues?.father_name ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Утас</label>
            <input
              name="father_phone"
              defaultValue={defaultValues?.father_phone ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Ажлын газар</label>
            <input
              name="father_workplace"
              defaultValue={defaultValues?.father_workplace ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700">Эхийн мэдээлэл</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Нэр</label>
            <input
              name="mother_name"
              defaultValue={defaultValues?.mother_name ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Утас</label>
            <input
              name="mother_phone"
              defaultValue={defaultValues?.mother_phone ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Ажлын газар</label>
            <input
              name="mother_workplace"
              defaultValue={defaultValues?.mother_workplace ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <label className="block text-xs font-medium text-slate-500">Гэрийн хаяг</label>
        <input
          name="home_address"
          defaultValue={defaultValues?.home_address ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="mt-4 block text-xs font-medium text-slate-500">Нэмэлт тэмдэглэл</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaultValues?.notes ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95 disabled:opacity-60"
        >
          {submitting ? "Хадгалж байна..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Болих
          </button>
        )}
      </div>
    </form>
  );
}
