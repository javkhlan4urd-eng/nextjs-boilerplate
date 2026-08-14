"use client";

import { useState } from "react";
import PhotoCapture, { type UploadedFile } from "./PhotoCapture";
import { LEVEL_LABELS } from "@/types/database";
import { LEVEL_STYLES } from "@/lib/colors";

interface ChildOption {
  id: string;
  label: string;
}
interface DomainOption {
  id: string;
  name: string;
}

export default function ObservationForm({
  action,
  childOptions,
  domainOptions,
  defaultChildId,
  stage,
  noteLabel,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  childOptions: ChildOption[];
  domainOptions: DomainOption[];
  defaultChildId?: string;
  stage?: "garaa" | "yavts";
  noteLabel?: string;
  submitLabel?: string;
}) {
  const [obsId] = useState(() => crypto.randomUUID());
  const [level, setLevel] = useState<number | null>(null);
  const [media, setMedia] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (fd) => {
        setError(null);
        if (!level) {
          setError("Хөгжлийн түвшинг сонгоно уу");
          return;
        }
        setSubmitting(true);
        try {
          await action(fd);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Алдаа гарлаа");
          setSubmitting(false);
        }
      }}
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="id" value={obsId} />
      <input type="hidden" name="level" value={level ?? ""} />
      <input type="hidden" name="media" value={JSON.stringify(media)} />
      {stage && <input type="hidden" name="stage" value={stage} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Хүүхэд <span className="text-red-500">*</span>
          </label>
          <select
            name="child_id"
            required
            defaultValue={defaultChildId ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Сонгоно уу
            </option>
            {childOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Огноо</label>
          <input
            type="date"
            name="observed_on"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">
          Суралцахуйн чиглэл <span className="text-red-500">*</span>
        </label>
        <select
          name="domain_id"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Сонгоно уу
          </option>
          {domainOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">
          Хөгжлийн түвшин <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevel(lv)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                level === lv
                  ? `border-transparent text-white shadow-sm ${LEVEL_STYLES[lv].solid}`
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {LEVEL_LABELS[lv]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">
          {noteLabel ?? "Ажиглалт, тэмдэглэл"}
        </label>
        <textarea
          name="note"
          rows={3}
          placeholder="Юу ажигласнаа энд бичнэ үү..."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">
          Зураг / бичлэг хавсаргах
        </label>
        <div className="mt-1">
          <PhotoCapture
            bucket="observation-media"
            folder={`observations/${obsId}`}
            multiple
            onChange={setMedia}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95 disabled:opacity-60"
      >
        {submitting ? "Хадгалж байна..." : (submitLabel ?? "Ажиглалт хадгалах")}
      </button>
    </form>
  );
}
