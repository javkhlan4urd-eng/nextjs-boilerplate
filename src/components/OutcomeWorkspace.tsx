"use client";

import { useEffect, useState, useCallback } from "react";
import PhotoCapture, { type UploadedFile } from "./PhotoCapture";
import { updateOutcomeConclusion, updateObservation, generateOutcomeAssessmentNow } from "@/app/(app)/observations/actions";
import { LEVEL_LABELS } from "@/types/database";
import { LEVEL_STYLES } from "@/lib/colors";

interface ObsRow {
  id: string;
  observed_on: string;
  note: string | null;
  level: number;
  media: { url: string; type: string }[];
}

interface ProgressData {
  observations: ObsRow[];
  count: number;
  threshold: number;
  conclusion: string | null;
  nextSteps: string | null;
}

function ObservationEditCard({
  obs,
  onSaved,
  onCancel,
}: {
  obs: ObsRow;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(obs.note ?? "");
  const [level, setLevel] = useState(obs.level);
  const [observedOn, setObservedOn] = useState(obs.observed_on);
  const [media, setMedia] = useState<UploadedFile[]>(
    obs.media.map((m) => ({ url: m.url, type: m.type as "image" | "video" }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await updateObservation(obs.id, note, level, media, observedOn);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4">
      <span className="text-xs font-semibold text-amber-600">Засварлаж байна</span>
      <input
        type="date"
        value={observedOn}
        onChange={(e) => setObservedOn(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[1, 2, 3, 4].map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => setLevel(lv)}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
              level === lv
                ? `border-transparent text-white shadow-sm ${LEVEL_STYLES[lv].solid}`
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {LEVEL_LABELS[lv]}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="mt-2">
        <PhotoCapture
          bucket="observation-media"
          folder={`observations/${obs.id}`}
          multiple
          initial={media}
          onChange={setMedia}
          onAnalyzed={(suggested) => setNote((prev) => (prev.trim() ? prev : suggested))}
        />
      </div>
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
}: {
  childId: string;
  domainId: string;
  outcomeId: string;
  domainName: string;
  outcomeCode: string;
  outcomeDescription: string;
  stage?: "garaa" | "yavts";
  createAction: (formData: FormData) => Promise<void>;
}) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [draftNote, setDraftNote] = useState("");
  const [draftLevel, setDraftLevel] = useState<number | null>(null);
  const [draftMedia, setDraftMedia] = useState<UploadedFile[]>([]);
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingObs, setSavingObs] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);

  const [conclusionDraft, setConclusionDraft] = useState("");
  const [nextStepsDraft, setNextStepsDraft] = useState("");
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
      }
    } finally {
      setLoading(false);
    }
  }, [childId, outcomeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveObservation() {
    setObsError(null);
    if (!draftLevel) {
      setObsError("Хөгжлийн түвшинг сонгоно уу");
      return;
    }
    setSavingObs(true);
    try {
      const fd = new FormData();
      fd.set("id", crypto.randomUUID());
      fd.set("child_id", childId);
      fd.set("domain_id", domainId);
      fd.set("outcome_id", outcomeId);
      fd.set("level", String(draftLevel));
      fd.set("observed_on", draftDate);
      fd.set("note", draftNote);
      if (stage) fd.set("stage", stage);
      fd.set("media", JSON.stringify(draftMedia));
      fd.set("no_redirect", "1");
      await createAction(fd);
      setDraftNote("");
      setDraftLevel(null);
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
      await updateOutcomeConclusion(childId, outcomeId, conclusionDraft, nextStepsDraft);
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

  const finalLevel = (() => {
    if (!data || data.observations.length === 0) return null;
    const avg = data.observations.reduce((s, o) => s + o.level, 0) / data.observations.length;
    return Math.min(4, Math.max(1, Math.round(avg)));
  })();

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
                  onSaved={() => {
                    setEditingId(null);
                    load();
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  key={o.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Ажиглалт {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[o.level].bg} ${LEVEL_STYLES[o.level].text}`}>
                        {LEVEL_LABELS[o.level]}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(o.id)}
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Засах
                      </button>
                    </div>
                  </div>
                  {o.media.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {o.media.map((m, mi) =>
                        m.type === "video" ? (
                          <video key={mi} src={m.url} className="h-20 w-20 rounded-lg object-cover" muted />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={mi} src={m.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                        )
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-400">{o.observed_on}</p>
                  <p className="mt-1 text-sm text-slate-700">{o.note || "—"}</p>
                </div>
              )
            )}

            <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-4">
              <span className="text-xs font-semibold text-indigo-500">
                Ажиглалт {(data?.observations.length ?? 0) + 1} (шинэ)
              </span>

              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[1, 2, 3, 4].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setDraftLevel(lv)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                      draftLevel === lv
                        ? `border-transparent text-white shadow-sm ${LEVEL_STYLES[lv].solid}`
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {LEVEL_LABELS[lv]}
                  </button>
                ))}
              </div>

              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                rows={3}
                placeholder="Ажиглалтын тэмдэглэл..."
                className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />

              <div className="mt-2">
                <PhotoCapture
                  bucket="observation-media"
                  folder={`observations/${childId}-${outcomeId}`}
                  multiple
                  onChange={setDraftMedia}
                  onAnalyzed={(suggested) => setDraftNote((prev) => (prev.trim() ? prev : suggested))}
                />
              </div>

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
                <h4 className="text-sm font-semibold text-emerald-800">📝 Дүгнэлт</h4>
                <button
                  type="button"
                  onClick={aiFill}
                  disabled={aiGenerating || !data || data.observations.length === 0}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-600 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                >
                  {aiGenerating ? "🤖 Бэлдэж байна..." : "🤖 AI-аар бөглөх"}
                </button>
              </div>
              <p className="mt-0.5 text-xs text-emerald-700/80">
                {data && data.count >= data.threshold
                  ? "AI автоматаар бэлдсэн дүгнэлт — шаардвал засаж хадгална уу."
                  : `${data?.threshold ?? 3}+ ажиглалт бичигдсэний дараа AI дүгнэлт автоматаар бэлдэнэ. Одоо байгаа зураг, тэмдэглэлээр "AI-аар бөглөх" товчоор ч бэлдүүлж болно.`}
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
              {finalLevel ? (
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1.5 text-sm font-semibold ${LEVEL_STYLES[finalLevel].bg} ${LEVEL_STYLES[finalLevel].text}`}
                >
                  {LEVEL_LABELS[finalLevel]}
                </span>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Ажиглалт нэмэгдэх тусам автоматаар тооцогдоно.</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                (Бичигдсэн ажиглалтуудын дундаж түвшнээс тооцогдоно)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
