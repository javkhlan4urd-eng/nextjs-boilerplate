"use client";

import { useMemo, useState } from "react";
import PhotoCapture, { type UploadedFile } from "./PhotoCapture";
import OutcomeWorkspace from "./OutcomeWorkspace";
import SevenFieldsEditor, { emptyObservationFields, analyzeObservation } from "./SevenFieldsEditor";
import { LEVEL_LABELS, ROUTINE_PERIODS } from "@/types/database";
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
  const [fields, setFields] = useState(emptyObservationFields());
  const [routinePeriod, setRoutinePeriod] = useState("");
  const [aiFilling, setAiFilling] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
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
          <input type="hidden" name="note" value={fields.note} />
          <input type="hidden" name="observed_fact" value={fields.observed_fact} />
          <input type="hidden" name="development_direction" value={fields.development_direction} />
          <input type="hidden" name="child_performance" value={fields.child_performance} />
          <input type="hidden" name="teacher_conclusion" value={fields.teacher_conclusion} />
          <input type="hidden" name="next_action" value={fields.next_action} />
          <input type="hidden" name="methodology_note" value={fields.methodology_note} />
          {stage && <input type="hidden" name="stage" value={stage} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500">Огноо</label>
              <input
                type="date"
                name="observed_on"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Өдрийн дэглэмийн цаг <span className="text-slate-400">(заавал биш)</span>
              </label>
              <select
                name="routine_period"
                value={routinePeriod}
                onChange={(e) => setRoutinePeriod(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Сонгоно уу</option>
                {ROUTINE_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-medium text-slate-500">
                Зураг / бичлэг хавсаргах
              </label>
              <button
                type="button"
                onClick={async () => {
                  const firstMedia = media.find((m) => m.type === "image") ?? media[0];
                  if (!firstMedia) return;
                  setAiError(null);
                  setAiFilling(true);
                  try {
                    const result = await analyzeObservation(
                      { mediaUrl: firstMedia.url },
                      { domainName: selectedDomain?.name }
                    );
                    setFields(result);
                    if (result.routine_period) setRoutinePeriod(result.routine_period);
                  } catch (e) {
                    setAiError(e instanceof Error ? e.message : "Алдаа гарлаа");
                  } finally {
                    setAiFilling(false);
                  }
                }}
                disabled={aiFilling || media.length === 0}
                title={media.length === 0 ? "Эхлээд зураг эсвэл бичлэг хавсаргана уу" : ""}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-600 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
              >
                {aiFilling ? "🤖 Бэлдэж байна..." : "🤖 AI-аар бэлтгэх"}
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Зураг хавсаргаад &quot;AI-аар бэлтгэх&quot; товч дарвал доорх 7 талбарыг автоматаар бөглөнө (шаардвал засаж болно).
            </p>
            {aiError && <p className="mt-1 text-xs text-red-600">{aiError}</p>}
            <div className="mt-1">
              <PhotoCapture
                bucket="observation-media"
                folder={`observations/${obsId}`}
                multiple
                onChange={setMedia}
              />
            </div>
          </div>

          <SevenFieldsEditor value={fields} onChange={setFields} />

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
