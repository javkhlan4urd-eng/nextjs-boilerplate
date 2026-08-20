import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/PrintButton";
import { CONCLUSION_THRESHOLD } from "@/lib/outcomeConclusion";
import { readinessVerdict, verdictStyle } from "@/lib/readiness";
import { formatChildName } from "@/lib/childName";
import { domainColor } from "@/lib/colors";
import GroupSummaryEditor from "@/components/GroupSummaryEditor";
import { saveOutcomeSummary, generateOutcomeSummaryDraft } from "./actions";

export default async function OutcomeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; schoolYear?: string; child?: string; domain?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, school_year, level")
    .eq("teacher_id", user!.id)
    .order("name");

  const schoolYears = Array.from(
    new Set((groups ?? []).map((g) => g.school_year).filter((y): y is string => !!y))
  ).sort();

  let childrenQuery = supabase
    .from("children")
    .select("id, first_name, last_name, group_id, groups!inner(teacher_id, name, school_year, level)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");
  if (sp.group) childrenQuery = childrenQuery.eq("group_id", sp.group);
  if (sp.schoolYear) childrenQuery = childrenQuery.eq("groups.school_year", sp.schoolYear);
  const { data: scopedChildren } = await childrenQuery;

  type ChildRow = {
    id: string;
    first_name: string;
    last_name: string | null;
    groups: { name: string; level: number | null };
  };
  const children = (scopedChildren ?? []) as unknown as ChildRow[];

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name, sort_order")
    .eq("teacher_id", user!.id)
    .order("sort_order");
  const domainList = domains ?? [];

  const { data: outcomesRaw } = await supabase
    .from("learning_outcomes")
    .select("id, domain_id, level, code, description, learning_domains!inner(teacher_id)")
    .eq("learning_domains.teacher_id", user!.id)
    .order("sort_order");
  const outcomes = outcomesRaw ?? [];

  const childIds = children.map((c) => c.id);
  let conclusions: {
    child_id: string;
    outcome_id: string;
    conclusion: string;
    observation_count: number;
    level: number | null;
  }[] = [];
  if (childIds.length > 0) {
    const { data } = await supabase
      .from("outcome_conclusions")
      .select("child_id, outcome_id, conclusion, observation_count, level")
      .in("child_id", childIds);
    conclusions = data ?? [];
  }

  const conclusionMap = new Map<string, (typeof conclusions)[number]>();
  for (const c of conclusions) conclusionMap.set(`${c.child_id}|${c.outcome_id}`, c);

  // Per-domain coverage across the whole scope: total possible (child × applicable outcome) vs achieved
  const coverageByDomain = domainList.map((d) => {
    let total = 0;
    let withConclusion = 0;
    for (const child of children) {
      const childLevel = child.groups?.level ?? null;
      const applicableOutcomes = outcomes.filter(
        (o) => o.domain_id === d.id && (!childLevel || !o.level || o.level === childLevel)
      );
      total += applicableOutcomes.length;
      for (const o of applicableOutcomes) {
        if (conclusionMap.has(`${child.id}|${o.id}`)) withConclusion += 1;
      }
    }
    return { domain: d.name, total, withConclusion };
  });

  const totalPossible = coverageByDomain.reduce((sum, c) => sum + c.total, 0);
  const totalWithConclusion = coverageByDomain.reduce((sum, c) => sum + c.withConclusion, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalWithConclusion / totalPossible) * 100) : 0;
  const topDomain = [...coverageByDomain]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.withConclusion / b.total - a.withConclusion / a.total)[0];

  // Явцын ажиглалтын тэмдэглэл (observations.outcome_id) тухайн СҮД-д дор хаяж 1 удаа
  // хийгдсэн эсэхийг түвшин + чиглэл тус бүрээр харуулна — outcome_conclusions-ийн AI босго
  // (CONCLUSION_THRESHOLD) хүрэхээс өмнө ч аль хэдийн бичигдсэн тэмдэглэлийн хамрагдалтыг
  // харуулах учир дээрх coverageByDomain-аас өөр, илүү өргөн хамрах хувь гарна.
  let noteObs: { child_id: string; outcome_id: string | null }[] = [];
  if (childIds.length > 0) {
    const { data } = await supabase
      .from("observations")
      .select("child_id, outcome_id")
      .in("child_id", childIds)
      .not("outcome_id", "is", null)
      .or("stage.eq.yavts,stage.is.null");
    noteObs = data ?? [];
  }
  const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
  const childById = new Map(children.map((c) => [c.id, c]));
  const notedSet = new Set<string>(); // `${level}|${outcomeId}`
  for (const r of noteObs) {
    if (!r.outcome_id) continue;
    const child = childById.get(r.child_id);
    const childLevel = child?.groups?.level ?? null;
    if (!childLevel) continue;
    const outcome = outcomeById.get(r.outcome_id);
    if (!outcome || (outcome.level && outcome.level !== childLevel)) continue;
    notedSet.add(`${childLevel}|${r.outcome_id}`);
  }

  const levelsInScope = Array.from(
    new Set(children.map((c) => c.groups?.level).filter((l): l is number => !!l))
  ).sort((a, b) => a - b);

  const noteCoverageByLevel = levelsInScope.map((level) => {
    const domainStats = domainList
      .map((d) => {
        const levelOutcomes = outcomes.filter((o) => o.domain_id === d.id && o.level === level);
        const total = levelOutcomes.length;
        const covered = levelOutcomes.filter((o) => notedSet.has(`${level}|${o.id}`)).length;
        return { domain: d.name, total, covered, pct: total > 0 ? Math.round((covered / total) * 100) : 0 };
      })
      .filter((d) => d.total > 0);
    const totalOutcomesForLevel = outcomes.filter((o) => o.level === level).length;
    const coveredForLevel = domainStats.reduce((sum, d) => sum + d.covered, 0);
    return {
      level,
      domainStats,
      totalOutcomesForLevel,
      coveredForLevel,
      pct: totalOutcomesForLevel > 0 ? Math.round((coveredForLevel / totalOutcomesForLevel) * 100) : 0,
    };
  });

  const selectedChild = sp.child ? children.find((c) => c.id === sp.child) : null;
  const selectedDomain = sp.domain ? domainList.find((d) => d.id === sp.domain) : null;

  const domainChildSummaries = selectedDomain
    ? [...children]
        .sort((a, b) => {
          const groupCmp = (a.groups?.name ?? "").localeCompare(b.groups?.name ?? "");
          return groupCmp !== 0 ? groupCmp : a.first_name.localeCompare(b.first_name);
        })
        .map((child) => {
        const childLevel = child.groups?.level ?? null;
        const applicableOutcomes = outcomes.filter(
          (o) => o.domain_id === selectedDomain.id && (!childLevel || !o.level || o.level === childLevel)
        );
        const total = applicableOutcomes.length;
        const achieved = applicableOutcomes.filter((o) => {
          const level = conclusionMap.get(`${child.id}|${o.id}`)?.level;
          return level !== null && level !== undefined && (level / 4) * 100 >= 70;
        }).length;
        const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
        return { child, total, achieved, pct, verdict: total > 0 ? readinessVerdict(pct) : null };
      })
    : [];

  let existingSummary = "";
  if (sp.group) {
    const { data: summaryRow } = await supabase
      .from("outcome_summaries")
      .select("content")
      .eq("group_id", sp.group)
      .maybeSingle();
    existingSummary = summaryRow?.content ?? "";
  }
  const groupLabel = sp.group ? groups?.find((g) => g.id === sp.group)?.name ?? "" : "";

  const childOutcomesTotal = selectedChild
    ? outcomes.filter((o) => {
        const childLevel = selectedChild.groups?.level ?? null;
        return !childLevel || !o.level || o.level === childLevel;
      })
    : [];
  const childOutcomesMastered = selectedChild
    ? childOutcomesTotal.filter((o) => {
        const level = conclusionMap.get(`${selectedChild.id}|${o.id}`)?.level;
        return level !== null && level !== undefined && (level / 4) * 100 >= 70;
      }).length
    : 0;
  const childMasteryPct =
    childOutcomesTotal.length > 0
      ? Math.round((childOutcomesMastered / childOutcomesTotal.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 p-6 text-white shadow-lg shadow-rose-200/60 sm:p-7">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-rose-100">
          📋 СҮД дүгнэлт
        </p>
        <h1 className="mt-1 text-2xl font-bold">СҮД дүгнэлтийн тайлан</h1>
        <p className="mt-1.5 max-w-lg text-sm text-rose-100">
          Суралцахуйн үр дүн (СҮД) тус бүрээр {CONCLUSION_THRESHOLD}+ тэмдэглэл цугласны дараа
          AI-аар автоматаар гарсан дүгнэлт, чиглэл бүрээр болон нэгдсэн байдлаар.
        </p>
      </div>

      <form className="no-print mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {schoolYears.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500">Хичээлийн жил</label>
            <select name="schoolYear" defaultValue={sp.schoolYear ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Бүх жил</option>
              {schoolYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500">Бүлэг</label>
          <select name="group" defaultValue={sp.group ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Бүх бүлэг</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.school_year ? ` (${g.school_year})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Хүүхэд (дэлгэрэнгүй)</label>
          <select name="child" defaultValue={sp.child ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">-- Зөвхөн нэгдсэн тойм --</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {formatChildName(c.first_name, c.last_name)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
        >
          Шүүх
        </button>
        <PrintButton />
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100 print:border-0 print:shadow-none">
        <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50 p-6 print:border-0 print:bg-white print:p-0">
        <h2 className="text-lg font-semibold text-slate-900">Чиглэл тус бүрийн нэгдсэн тойм</h2>
        <p className="text-sm text-slate-500">
          Суралцахуйн 7 чиглэлээр гарсан дүгнэлтийн ерөнхий явц.
        </p>
        </div>
        <div className="p-6 print:p-0">

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-900">{children.length}</p>
            <p className="text-xs text-slate-500">Хамрагдсан хүүхэд</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-900">{conclusions.length}</p>
            <p className="text-xs text-slate-500">Нийт СҮД дүгнэлт</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-900">
              {overallPct}
              <span className="text-base font-medium text-slate-400">%</span>
            </p>
            <p className="text-xs text-slate-500">
              Дундаж хамрах хувь
              {topDomain ? ` · тэргүүлэгч: ${topDomain.domain}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {coverageByDomain.map((c, i) => {
            const pct = c.total > 0 ? Math.round((c.withConclusion / c.total) * 100) : 0;
            const palette = domainColor(i);
            const d = domainList[i];
            const params = new URLSearchParams({
              ...(sp.group ? { group: sp.group } : {}),
              ...(sp.schoolYear ? { schoolYear: sp.schoolYear } : {}),
              domain: d.id,
            });
            return (
              <Link
                key={c.domain}
                href={`?${params.toString()}`}
                className={`block rounded-xl border p-4 transition-colors hover:border-indigo-300 ${
                  selectedDomain?.id === d.id ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: palette.dot }}
                    />
                    <span className="text-sm font-medium text-slate-800">{c.domain}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${palette.bg} ${palette.text}`}
                  >
                    {c.withConclusion} дүгнэлт гарсан
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: palette.dot }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {pct}% хамрагдсан ({c.withConclusion}/{c.total})
                </p>
              </Link>
            );
          })}
        </div>

        {noteCoverageByLevel.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-slate-900">
              Явцын ажиглалтын тэмдэглэлийн хамрагдалт — түвшин, чиглэлээр
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Тухайн түвшний нийт СҮД-ээс хэдэд нь дор хаяж 1 удаа явцын ажиглалтын тэмдэглэл
              бичигдсэнийг харуулна (AI дүгнэлтийн {CONCLUSION_THRESHOLD}+ босгыг хүлээхгүйгээр).
            </p>
            <div className="mt-4 space-y-6">
              {noteCoverageByLevel.map((lvl) => (
                <div key={lvl.level} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">{lvl.level}-р түвшин</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {lvl.coveredForLevel}/{lvl.totalOutcomesForLevel} СҮД · {lvl.pct}%
                    </span>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                          <th className="py-2 pr-3">Чиглэл</th>
                          <th className="px-2 py-2 text-center">Тэмдэглэл хийгдсэн СҮД</th>
                          <th className="px-2 py-2 text-center">Нийт СҮД</th>
                          <th className="px-2 py-2 text-center">Хувь</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lvl.domainStats.map((d, i) => (
                          <tr key={d.domain} className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium text-slate-700">{d.domain}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{d.covered}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{d.total}</td>
                            <td className="px-2 py-2 text-center">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${domainColor(i).bg} ${domainColor(i).text}`}
                              >
                                {d.pct}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sp.group && (
          <div className="no-print mt-8 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Нэгдсэн дүгнэлт</h3>
            <p className="mt-1 text-xs text-slate-500">
              {groupLabel} бүлгийн СҮД дүгнэлтийн нэгдсэн тайлан — AI-аар бэлтгэх эсвэл өөрөө шивж бичих
              боломжтой.
            </p>
            <GroupSummaryEditor
              groupId={sp.group}
              initialContent={existingSummary}
              generateAction={generateOutcomeSummaryDraft}
              saveAction={saveOutcomeSummary}
            />
          </div>
        )}

        {selectedChild ? (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-slate-900">
              {formatChildName(selectedChild.first_name, selectedChild.last_name)} — чиглэл тус бүрийн дэлгэрэнгүй дүгнэлт
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {childOutcomesMastered}
                  <span className="text-base font-medium text-slate-400"> / {childOutcomesTotal.length}</span>
                </p>
                <p className="text-xs text-slate-500">СҮД эзэмшсэн (нийт эзэмших ёстойгоос)</p>
              </div>
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500"
                    style={{ width: `${childMasteryPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{childMasteryPct}% эзэмшсэн</p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {domainList.map((d) => {
                const childLevel = selectedChild.groups?.level ?? null;
                const domainOutcomes = outcomes.filter(
                  (o) => o.domain_id === d.id && (!childLevel || !o.level || o.level === childLevel)
                );
                if (domainOutcomes.length === 0) return null;
                return (
                  <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-800">{d.name}</h4>
                    <div className="mt-3 space-y-3">
                      {domainOutcomes.map((o) => {
                        const conc = conclusionMap.get(`${selectedChild.id}|${o.id}`);
                        const pct = conc?.level != null ? Math.round((conc.level / 4) * 100) : null;
                        const verdict = pct !== null ? readinessVerdict(pct) : null;
                        const style = verdict ? verdictStyle(verdict) : null;
                        return (
                          <div key={o.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-slate-700">
                                {o.code}: <span className="font-normal text-slate-600">{o.description}</span>
                              </p>
                              {pct !== null && style ? (
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}
                                >
                                  {pct}% · {verdict}
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                                  Түвшин тодорхойлогдоогүй
                                </span>
                              )}
                            </div>
                            {pct !== null && (
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                            {conc ? (
                              <p className="mt-2 text-slate-800">
                                <span className="font-semibold text-emerald-700">Дүгнэлт:</span> {conc.conclusion}
                              </p>
                            ) : (
                              <p className="mt-2 text-xs text-slate-400">
                                Дүгнэлт гараагүй (тэмдэглэл хараахан {CONCLUSION_THRESHOLD}-д хүрээгүй).
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : selectedDomain ? (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-slate-900">
              {selectedDomain.name} — хүүхэд тус бүрийн үр дүн
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 pr-3">Хүүхэд</th>
                    <th className="px-2 py-2 text-center">Бүлэг</th>
                    <th className="px-2 py-2 text-center">Эзэмшсэн</th>
                    <th className="px-2 py-2 text-center">Хувь</th>
                    <th className="px-2 py-2 text-center">Дүгнэлт</th>
                    <th className="no-print px-2 py-2 text-center">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {domainChildSummaries.map(({ child, total, achieved, pct, verdict }) => {
                    const vs = verdict ? verdictStyle(verdict) : null;
                    const params = new URLSearchParams({
                      ...(sp.group ? { group: sp.group } : {}),
                      ...(sp.schoolYear ? { schoolYear: sp.schoolYear } : {}),
                      child: child.id,
                    });
                    return (
                      <tr key={child.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-800">
                          {formatChildName(child.first_name, child.last_name)}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-600">{child.groups?.name}</td>
                        <td className="px-2 py-2 text-center">
                          {total > 0 ? `${achieved}/${total}` : "—"}
                        </td>
                        <td className="px-2 py-2 text-center">{total > 0 ? `${pct}%` : "—"}</td>
                        <td className="px-2 py-2 text-center">
                          {verdict && vs ? (
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${vs.bg} ${vs.text}`}>
                              {verdict}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="no-print px-2 py-2 text-center">
                          <Link href={`?${params.toString()}`} className="text-xs font-medium text-indigo-600 hover:underline">
                            Дэлгэрэнгүй
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            Дээрх чиглэлүүдийн аль нэгийг сонговол тухайн чиглэлийн бүх хүүхдийн үр дүнг, эсвэл тодорхой
            хүүхдийг сонговол чиглэл бүрийн СҮД-ийн дэлгэрэнгүй дүгнэлтийг текстээр харуулна.
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
