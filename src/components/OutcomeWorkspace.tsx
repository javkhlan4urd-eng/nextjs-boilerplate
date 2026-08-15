"use client";

import { useEffect, useState, useCallback } from "react";
import PhotoCapture, { type UploadedFile } from "./PhotoCapture";
import {
  updateOutcomeConclusion,
  updateObservation,
  generateOutcomeAssessmentNow,
  createObservationsFromRecordedActivity,
  type ObservationFields,
} from "@/app/(app)/observations/actions";
import SevenFieldsEditor, { emptyObservationFields, analyzeObservation } from "./SevenFieldsEditor";
import { LEVEL_LABELS, OBSERVATION_FIELDS } from "@/types/database";
import { LEVEL_STYLES } from "@/lib/colors";

interface ObsRow {
  id: string;
  observed_on: string;
  level: number | null;
  note: string | null;
  observed_fact: string | null;
  development_direction: string | null;
  child_performance: string | null;
  teacher_conclusion: string | null;
  next_action: string | null;
  methodology_note: string | null;
  media: { url: string; type: string }[];
}

interface RelatedOutcome {
  outcomeId: string;
  domainId: string;
  domainName: string;
  code: string;
  description: string;
}

interface RelatedObsGroup extends RelatedOutcome {
  observations: ObsRow[];
}

function buildRecordedActivitySummary(observations: ObsRow[]): string {
  return observations
    .map((o, i) => {
      const parts = [o.observed_fact, o.child_performance, o.note].filter(
        (p): p is string => !!p && p.trim().length > 0
      );
      if (parts.length === 0) return null;
      return `Ажиглалт ${i + 1}: ${parts.join(" ")}`;
    })
    .filter((s): s is string => s !== null)
    .join("\n");
}

interface ProgressData {
  observations: ObsRow[];
  count: number;
  threshold: number;
  conclusion: string | null;
  nextSteps: string | null;
  level: number | null;
  related: RelatedOutcome[];
  relatedObservations: RelatedObsGroup[];
}

function ObservationReadCard({
  obs,
  index,
  onEdit,
}: {
  obs: ObsRow;
  index: number;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const extraFields = OBSERVATION_FIELDS.filter((f) => f.key !== "note" && obs[f.key]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">Ажиглалт {index + 1}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Засах
        </button>
      </div>
      {obs.media.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {obs.media.map((m, mi) =>
            m.type === "video" ? (
              <video key={mi} src={m.url} className="h-20 w-20 rounded-lg object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={mi} src={m.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
            )
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">{obs.observed_on}</p>
      <p className="mt-1 text-sm text-slate-700">{obs.note || "—"}</p>

      {extraFields.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-xs font-medium text-violet-600 hover:underline"
          >
            {expanded ? "Дэлгэрэнгүйг нуух ▴" : "Дэлгэрэнгүй харах ▾"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5 rounded-lg bg-violet-50/60 p-2.5">
              {extraFields.map((f) => (
                <p key={f.key} className="text-xs text-slate-700">
                  <span className="font-semibold text-violet-700">
                    {f.letter}. {f.label}:
                  </span>{" "}
                  {obs[f.key]}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ObservationEditCard({
  obs,
  domainName,
  outcomeCode,
  outcomeDescription,
  onSaved,
  onCancel,
}: {
  obs: ObsRow;
  domainName: string;
  outcomeCode: string;
  outcomeDescription: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<ObservationFields>({
    observed_fact: obs.observed_fact ?? "",
    development_direction: obs.development_direction ?? "",
    child_performance: obs.child_performance ?? "",
    note: obs.note ?? "",
    teacher_conclusion: obs.teacher_conclusion ?? "",
    next_action: obs.next_action ?? "",
    methodology_note: obs.methodology_note ?? "",
  });
  const [observedOn, setObservedOn] = useState(obs.observed_on);
  const [media, setMedia] = useState<UploadedFile[]>(
    obs.media.map((m) => ({ url: m.url, type: m.type as "image" | "video" }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiFilling, setAiFilling] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function aiFill() {
    const firstMedia = media.find((m) => m.type === "image") ?? media[0];
    if (!firstMedia) return;
    setAiError(null);
    setAiFilling(true);
    try {
      const result = await analyzeObservation(
        { mediaUrl: firstMedia.url },
        { domainName, outcomeCode, outcomeDescription }
      );
      setFields(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setAiFilling(false);
    }
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await updateObservation(obs.id, fields, media, observedOn);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  const hasMedia = media.length > 0;

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-amber-600">Засварлаж байна</span>
        <button
          type="button"
          onClick={aiFill}
          disabled={aiFilling || !hasMedia}
          title={!hasMedia ? "Эхлээд зураг эсвэл бичлэг хавсаргана уу" : ""}
          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-600 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
        >
          {aiFilling ? "🤖 Бэлдэж байна..." : "🤖 AI-аар бэлтгэх"}
        </button>
      </div>
      {aiError && <p className="mt-1 text-xs text-red-600">{aiError}</p>}
      <input
        type="date"
        value={observedOn}
        onChange={(e) => setObservedOn(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="mt-2">
        <PhotoCapture
          bucket="observation-media"
          folder={`observations/${obs.id}`}
          multiple
          initial={media}
          onChange={setMedia}
        />
      </div>
      <SevenFieldsEditor value={fields} onChange={setFields} />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
        >
          {saving ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Цуцлах
        </button>
      </div>
    </div>
  );
}

export default function OutcomeWorkspace({
  childId,
  domainId,
  outcomeId,
  domainName,
  outcomeCode,
  outcomeDescription,
  stage,
  createAction,
  onJumpToOutcome,
}: {
  childId: string;
  domainId: string;
  outcomeId: string;
  domainName: string;
  outcomeCode: string;
  outcomeDescription: string;
  stage?: "garaa" | "yavts";
  createAction: (formData: FormData) => Promise<void>;
  onJumpToOutcome?: (domainId: string, outcomeId: string) => void;
}) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [draftFields, setDraftFields] = useState<ObservationFields>(emptyObservationFields());
  const [draftMedia, setDraftMedia] = useState<UploadedFile[]>([]);
  const [draftPlan, setDraftPlan] = useState("");
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingObs, setSavingObs] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);
  const [aiFillingObs, setAiFillingObs] = useState(false);
  const [aiFillObsError, setAiFillObsError] = useState<string | null>(null);

  const [writingRelated, setWritingRelated] = useState(false);
  const [writeRelatedResult, setWriteRelatedResult] = useState<string | null>(null);
  const [writeRelatedError, setWriteRelatedError] = useState<string | null>(null);

  const [conclusionDraft, setConclusionDraft] = useState("");
  const [nextStepsDraft, setNextStepsDraft] = useState("");
  const [assessedLevel, setAssessedLevel] = useState<number | null>(null);
  const [savingConclusion, setSavingConclusion] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/outcome-progress?child_id=${childId}&outcome_id=${outcomeId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setConclusionDraft(json.conclusion ?? "");
        setNextStepsDraft(json.nextSteps ?? "");
        setAssessedLevel(json.level ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [childId, outcomeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function aiFillDraft() {
    const firstMedia = draftMedia.find((m) => m.type === "image") ?? draftMedia[0];
    if (!firstMedia && !draftPlan.trim()) return;
    setAiFillObsError(null);
    setAiFillingObs(true);
    try {
      const result = await analyzeObservation(
        { mediaUrl: firstMedia?.url, planText: draftPlan },
        { domainName, outcomeCode, outcomeDescription }
      );
      setDraftFields(result);
    } catch (e) {
      setAiFillObsError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setAiFillingObs(false);
    }
  }

  async function writeRelatedFromPlan() {
    if (!data) return;
    const recordedActivity = buildRecordedActivitySummary(data.observations);
    if (!recordedActivity.trim()) return;
    setWritingRelated(true);
    setWriteRelatedError(null);
    setWriteRelatedResult(null);
    try {
      const { created, failed } = await createObservationsFromRecordedActivity(
        childId,
        recordedActivity,
        draftDate,
        stage,
        data.related.map((r) => ({
          domainId: r.domainId,
          outcomeId: r.outcomeId,
          domainName: r.domainName,
          code: r.code,
          description: r.description,
        }))
      );
      setWriteRelatedResult(
        failed > 0
          ? `${created} СҮД-д амжилттай бичлээ, ${failed} нь амжилтгүй боллоо.`
          : `${created} холбоотой СҮД-д ажиглалт амжилттай бичигдлээ.`
      );
      await load();
    } catch (e) {
      setWriteRelatedError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setWritingRelated(false);
    }
  }

  async function saveObservation() {
    setObsError(null);
    setSavingObs(true);
    try {
      const fd = new FormData();
      fd.set("id", crypto.randomUUID());
      fd.set("child_id", childId);
      fd.set("domain_id", domainId);
      fd.set("outcome_id", outcomeId);
      fd.set("observed_on", draftDate);
      fd.set("note", draftFields.note);
      fd.set("observed_fact", draftFields.observed_fact);
      fd.set("development_direction", draftFields.development_direction);
      fd.set("child_performance", draftFields.child_performance);
      fd.set("teacher_conclusion", draftFields.teacher_conclusion);
      fd.set("next_action", draftFields.next_action);
      fd.set("methodology_note", draftFields.methodology_note);
      if (stage) fd.set("stage", stage);
      fd.set("media", JSON.stringify(draftMedia));
      fd.set("no_redirect", "1");
      await createAction(fd);
      setDraftFields(emptyObservationFields());
      setDraftMedia([]);
      await load();
    } catch (e) {
      setObsError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setSavingObs(false);
    }
  }

  async function saveConclusion() {
    setSavingConclusion(true);
    try {
      await updateOutcomeConclusion(childId, outcomeId, conclusionDraft, nextStepsDraft, assessedLevel);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } finally {
      setSavingConclusion(false);
    }
  }

  async function aiFill() {
    setAiError(null);
    setAiGenerating(true);
    try {
      const result = await generateOutcomeAssessmentNow(childId, outcomeId);
      setConclusionDraft(result.conclusion);
      setNextStepsDraft(result.nextSteps);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setAiGenerating(false);
    }
  }

  const hasDraftMedia = draftMedia.length > 0;
  const hasRecordedActivity = data ? buildRecordedActivitySummary(data.observations).trim().length > 0 : false;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-500 to-teal-500 p-5 text-white shadow-lg shadow-indigo-200">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-100">{domainName}</p>
        <h3 className="mt-1 text-lg font-semibold">{outcomeCode}</h3>
        <p className="mt-1 text-sm text-indigo-100">{outcomeDescription}</p>
        {data && (
          <p className="mt-3 text-xs font-medium text-white/90">
            {data.count}/{data.threshold} ажиглалт бичигдсэн
            {data.count >= data.threshold ? " — AI дүгнэлт бэлэн" : ""}
          </p>
        )}
      </div>

      {data && data.related.length > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
          <h4 className="text-sm font-semibold text-violet-800">
            🔗 Холбоотой СҮД (бусад чиглэлүүд)
          </h4>
          <p className="mt-0.5 text-xs text-violet-700/80">
            Энэ ажиглалт/үйл ажиллагаа доорх бусад чиглэлийн СҮД-тэй мөн уялдаатай (сургалтын
            хөтөлбөрийн дагуу).
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.related.map((r) => (
              <button
                key={r.outcomeId}
                type="button"
                onClick={() => onJumpToOutcome?.(r.domainId, r.outcomeId)}
                disabled={!onJumpToOutcome}
                title={r.description}
                className="rounded-full border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-100 disabled:cursor-default disabled:opacity-80"
              >
                <span className="font-semibold">{r.code}</span>
                <span className="ml-1 text-violet-400">· {r.domainName}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-violet-200 pt-3">
            <button
              type="button"
              onClick={writeRelatedFromPlan}
              disabled={writingRelated || !hasRecordedActivity}
              title={
                !hasRecordedActivity
                  ? "Эхлээд энэ СҮД-д дор хаяж нэг ажиглалт бичиж хадгална уу"
                  : ""
              }
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-violet-600 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:cursor-default disabled:opacity-50"
            >
              {writingRelated
                ? `🤖 ${data.related.length} СҮД-д бичиж байна...`
                : `🤖 Бичигдсэн ажиглалтад үндэслэн холбоотой ${data.related.length} СҮД-д мөн ажиглалт бичих`}
            </button>
            <p className="mt-1 text-xs text-violet-700/70">
              Энэ СҮД-д аль хэдийн бичигдсэн бодит ажиглалтын тэмдэглэлд (төлөвлөлт биш) үндэслэн, AI
              холбоотой СҮД бүрт мөн адил үйл ажиллагааг өөр өнцгөөс тодруулан бичиж, шууд хадгална.
              Дараа нь &quot;Холбоотой СҮД дэх ажиглалтууд&quot; хэсэгт засаж болно.
            </p>
            {!hasRecordedActivity && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                ⚠️ Идэвхжүүлэхийн тулд эхлээд энэ СҮД-д дор хаяж нэг ажиглалт (Ажиглалт 1, 2, 3...)
                бичиж хадгална уу.
              </p>
            )}
            {writeRelatedResult && <p className="mt-1 text-xs text-emerald-700">{writeRelatedResult}</p>}
            {writeRelatedError && <p className="mt-1 text-xs text-red-600">{writeRelatedError}</p>}
          </div>
        </div>
      )}

      {data && data.relatedObservations.length > 0 && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
          <h4 className="text-sm font-semibold text-teal-800">
            🔁 Холбоотой СҮД дэх ажиглалтууд
          </h4>
          <p className="mt-0.5 text-xs text-teal-700/80">
            Энэ хүүхдийн холбоотой чиглэлийн СҮД-д бичигдсэн ажиглалтууд уялдаа бүхий тул эндээс
            мөн харагдана.
          </p>
          <div className="mt-3 space-y-4">
            {data.relatedObservations.map((group) => (
              <div key={group.outcomeId}>
                <button
                  type="button"
                  onClick={() => onJumpToOutcome?.(group.domainId, group.outcomeId)}
                  disabled={!onJumpToOutcome}
                  title={group.description}
                  className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-white px-2.5 py-1 text-xs font-medium text-teal-700 shadow-sm hover:bg-teal-100 disabled:cursor-default disabled:opacity-80"
                >
                  <span className="font-semibold">{group.code}</span>
                  <span className="text-teal-400">· {group.domainName}</span>
                </button>
                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.observations.map((o, i) =>
                    editingId === o.id ? (
                      <ObservationEditCard
                        key={o.id}
                        obs={o}
                        domainName={group.domainName}
                        outcomeCode={group.code}
                        outcomeDescription={group.description}
                        onSaved={() => {
                          setEditingId(null);
                          load();
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <ObservationReadCard
                        key={o.id}
                        obs={o}
                        index={i}
                        onEdit={() => setEditingId(o.id)}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Ачаалж байна...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.observations.map((o, i) =>
              editingId === o.id ? (
                <ObservationEditCard
                  key={o.id}
                  obs={o}
                  domainName={domainName}
                  outcomeCode={outcomeCode}
                  outcomeDescription={outcomeDescription}
                  onSaved={() => {
                    setEditingId(null);
                    load();
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <ObservationReadCard
                  key={o.id}
                  obs={o}
                  index={i}
                  onEdit={() => setEditingId(o.id)}
                />
              )
            )}

            <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-500">
                  Ажиглалт {(data?.observations.length ?? 0) + 1} (шинэ)
                </span>
                <button
                  type="button"
                  onClick={aiFillDraft}
                  disabled={aiFillingObs || (!hasDraftMedia && !draftPlan.trim())}
                  title={
                    !hasDraftMedia && !draftPlan.trim()
                      ? "Эхлээд зураг/бичлэг хавсаргах эсвэл үйл ажиллагааны төлөвлөлт бичнэ үү"
                      : ""
                  }
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-600 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
                >
                  {aiFillingObs ? "🤖 Бэлдэж байна..." : "🤖 AI-аар бэлтгэх"}
                </button>
              </div>
              {aiFillObsError && <p className="mt-1 text-xs text-red-600">{aiFillObsError}</p>}

              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />

              <div className="mt-2">
                <label className="block text-xs font-semibold text-indigo-700">
                  🗓 Үйл ажиллагааны төлөвлөлт{" "}
                  <span className="font-normal text-slate-400">(заавал биш)</span>
                </label>
                <textarea
                  value={draftPlan}
                  onChange={(e) => setDraftPlan(e.target.value)}
                  rows={2}
                  placeholder="Ямар үйл ажиллагаа хийхээр төлөвлөж байгаагаа бичвэл AI үүнд үндэслэн тэмдэглэлийг бэлдэнэ."
                  className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-sm"
                />
              </div>

              <div className="mt-2">
                <PhotoCapture
                  bucket="observation-media"
                  folder={`observations/${childId}-${outcomeId}`}
                  multiple
                  onChange={setDraftMedia}
                />
              </div>

              <SevenFieldsEditor value={draftFields} onChange={setDraftFields} />

              {obsError && <p className="mt-2 text-xs text-red-600">{obsError}</p>}

              <button
                type="button"
                onClick={saveObservation}
                disabled={savingObs}
                className="mt-3 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {savingObs ? "Хадгалж байна..." : "+ Ажиглалт нэмэх"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-emerald-800">📝 Нэгдсэн дүгнэлт</h4>
                <button
                  type="button"
                  onClick={aiFill}
                  disabled={aiGenerating || !data || data.observations.length === 0}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-600 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                >
                  {aiGenerating ? "🤖 Нэгтгэж байна..." : "🤖 AI-аар нэгтгэн бичих"}
                </button>
              </div>
              <p className="mt-0.5 text-xs text-emerald-700/80">
                {data && data.count >= data.threshold
                  ? "AI автоматаар бэлдсэн дүгнэлт — шаардвал засаж хадгална уу."
                  : `${data?.threshold ?? 3}+ ажиглалт бичигдсэний дараа AI дүгнэлт автоматаар бэлдэнэ. Одоо байгаа ажиглалтуудаар "AI-аар нэгтгэн бичих" товчоор ч бэлдүүлж болно.`}
              </p>
              {aiError && <p className="mt-1 text-xs text-red-600">{aiError}</p>}
              <textarea
                value={conclusionDraft}
                onChange={(e) => setConclusionDraft(e.target.value)}
                rows={4}
                placeholder="Дүгнэлт бичих..."
                className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
              />

              <h4 className="mt-4 text-sm font-semibold text-amber-800">➡️ Цаашид</h4>
              <textarea
                value={nextStepsDraft}
                onChange={(e) => setNextStepsDraft(e.target.value)}
                rows={2}
                placeholder="Цаашид анхаарах, дэмжих чиглэл..."
                className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
              />

              <h4 className="mt-4 text-sm font-semibold text-slate-800">🏁 Хөгжлийн түвшин</h4>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {[1, 2, 3, 4].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setAssessedLevel(lv)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                      assessedLevel === lv
                        ? `border-transparent text-white shadow-sm ${LEVEL_STYLES[lv].solid}`
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {LEVEL_LABELS[lv]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={saveConclusion}
                disabled={savingConclusion}
                className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {savingConclusion ? "Хадгалж байна..." : "Дүгнэлт хадгалах"}
              </button>
              {savedNotice && <span className="ml-3 text-sm text-emerald-600">Хадгалагдлаа ✓</span>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-800">🏁 Үнэлгээ</h4>
              {assessedLevel ? (
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1.5 text-sm font-semibold ${LEVEL_STYLES[assessedLevel].bg} ${LEVEL_STYLES[assessedLevel].text}`}
                >
                  {LEVEL_LABELS[assessedLevel]}
                </span>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Дүгнэлт хэсэгт хөгжлийн түвшинг сонгоно уу.</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                (Дүгнэлт бичихдээ сонгосон эцсийн түвшин)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
