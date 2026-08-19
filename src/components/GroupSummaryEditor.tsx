"use client";

import { useState } from "react";

export default function GroupSummaryEditor({
  groupId,
  initialContent,
  generateAction,
  saveAction,
}: {
  groupId: string;
  initialContent: string;
  generateAction: (groupId: string) => Promise<string>;
  saveAction: (groupId: string, content: string) => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const draft = await generateAction(groupId);
      setContent(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI дүгнэлт бэлтгэхэд алдаа гарлаа");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveAction(groupId, content);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {generating ? "Бэлтгэж байна…" : "🤖 AI-аар бэлтгэх"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {savedAt && <span className="text-xs text-emerald-600">Хадгалагдлаа ✓</span>}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSavedAt(null);
        }}
        placeholder="Дүгнэлтийг AI-аар бэлтгэх эсвэл өөрөө шивж бичнэ үү…"
        rows={14}
        className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed"
      />
    </div>
  );
}
