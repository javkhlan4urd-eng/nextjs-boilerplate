"use client";

import { useMemo, useState } from "react";
import PhotoCapture, { type UploadedFile } from "./PhotoCapture";
import OutcomeWorkspace from "./OutcomeWorkspace";
import { LEVEL_LABELS } from "@/types/database";
import { LEVEL_STYLES } from "@/lib/colors";

interface ChildOption {
  id: string;
  label: string;
  groupLevel: number | null;
}
interface DomainOption {
  id: string;
  name: string;
}
interface OutcomeOption {
  id: string;
  domain_id: string;
  level: number | null;
  code: string;
  description: string;
}

export default function ObservationForm({
  action,
  childOptions,
  domainOptions,
  outcomeOptions = [],
  defaultChildId,
  stage,
  noteLabel,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  childOptions: ChildOption[];
  domainOptions: DomainOption[];
  outcomeOptions?: OutcomeOption[];
  defaultChildId?: string;
  stage?: "garaa" | "yavts";
  noteLabel?: string;
  submitLabel?: string;
}) {
  const [obsId] = useState(() => crypto.randomUUID());
  const [level, setLevel] = useState<number | null>(null);
  const [media, setMedia] = useState<UploadedFile[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [childId, setChildId] = useState(defaultChildId ?? "");
  const [domainId, setDomainId] = useState("");
  const [outcomeId, setOutcomeId] = useState("");

  const selectedChild = childOptions.find((c) => c.id === childId);
  const selectedDomain = domainOptions.find((d) => d.id === domainId);
  const selectedOutcome = outcomeOptions.find((o) => o.id === outcomeId);

  const filteredOutcomes = useMemo(() => {
    if (!domainId) return [];
    return outcomeOptions.filter(
      (o) =>
        o.domain_id === domainId &&
        (!selectedChild?.groupLevel || !o.level || o.level === selectedChild.groupLevel)
    );
  }, [outcomeOptions, domainId, selectedChild]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Хүүхэд <span className="text-red-500">*</span>
          </label>
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
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
          <label className="block text-xs font-medium text-slate-500">
            Суралцахуйн чиглэл <span className="text-red-500">*</span>
          </label>
          <select
            value={domainId}
            onChange={(e) => {
              setDomainId(e.target.value);
              setOutcomeId("");
            }}
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

        {domainId && filteredOutcomes.length > 0 && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">
              Суралцахуйн үр дүн (СҮД) <span className="text-slate-400">(заавал биш)</span>
            </label>
            <select
              value={outcomeId}
              onChange={(e) => setOutcomeId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- Ерөнхий (тодорхой СҮД сонгохгүй) --</option>
              {filteredOutcomes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code}: {o.description}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Тодорхой СҮД сонговол доор тухайн СҮД-ийн ажиглалтуудыг зэрэгцүүлж харж, шинээр нэмэх
              боломжтой болно.
            </p>
          </div>
        )}
      </div>

      {childId && outcomeId && selectedOutcome ? (
        <OutcomeWorkspace
          childId={childId}
          domainId={domainId}
          outcomeId={outcomeId}
          domainName={selectedDomain?.name ?? ""}
          outcomeCode={selectedOutcome.code}
          outcomeDescription={selectedOutcome.description}
          stage={stage}
          createAction={action}
          onJumpToOutcome={(newDomainId, newOutcomeId) => {
            setDomainId(newDomainId);
            setOutcomeId(newOutcomeId);
          }}
        />
      ) : (
        <form
          action={async (fd) => {
            setError(null);
            if (!childId) {
              setError("Хүүхдийг сонгоно уу");
              return;
            }
            if (!domainId) {
              setError("Чиглэлийг сонгоно уу");
              return;
            }
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
          <input type="hidden" name="child_id" value={childId} />
          <input type="hidden" name="domain_id" value={domainId} />
          <input type="hidden" name="level" value={level ?? ""} />
          <input type="hidden" name="media" value={JSON.stringify(media)} />
          {stage && <input type="hidden" name="stage" value={stage} />}

          <div>
            <label className="block text-xs font-medium text-slate-500">Огноо</label>
            <input
              type="date"
              name="observed_on"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
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
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Юу ажигласнаа энд бичнэ үү (эсвэл зураг хавсаргаад AI-аар автоматаар бичүүлнэ үү)..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500">
              Зураг / бичлэг хавсаргах
            </label>
            <p className="mt-0.5 text-xs text-slate-400">
              Зураг хавсаргавал AI автоматаар ажиглалтын тэмдэглэл санал болгоно (шаардвал засаж болно).
            </p>
            <div className="mt-1">
              <PhotoCapture
                bucket="observation-media"
                folder={`observations/${obsId}`}
                multiple
                onChange={setMedia}
                onAnalyzed={(suggested) => setNote((prev) => (prev.trim() ? prev : suggested))}
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
      )}
    </div>
  );
}
