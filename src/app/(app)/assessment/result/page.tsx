import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER, readinessVerdict, verdictStyle, fetchAllAchievedChecks } from "@/lib/readiness";
import { CategoryAchievedBar } from "@/components/OutcomeCharts";
import PrintButton from "@/components/PrintButton";
import { formatChildName } from "@/lib/childName";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import GroupSummaryEditor from "@/components/GroupSummaryEditor";
import { saveReadinessSummary, generateReadinessSummaryDraft } from "./actions";

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${year} оны ${Number(m)}-р сар`;
}

export default async function ResultAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; schoolYear?: string; month?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const selectedCategory = sp.category && (CATEGORY_ORDER as readonly string[]).includes(sp.category) ? sp.category : null;
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

  const { data: criteriaRaw } = await supabase
    .from("readiness_criteria")
    .select("id, level, category, number")
    .eq("teacher_id", user!.id);
  const criteria = criteriaRaw ?? [];

  const childIds = children.map((c) => c.id);
  const checks = await fetchAllAchievedChecks(supabase, childIds);

  // A single "effective month" only makes sense when scoped to one group — different
  // groups are commonly assessed in entirely different months/years (e.g. a group's
  // historical data from a prior school year), so forcing one shared month across all
  // groups would incorrectly zero out everyone outside that one month.
  const monthOptions = sp.group
    ? Array.from(new Set(checks.map((c) => c.checked_on.slice(0, 7)))).sort()
    : [];
  const effectiveMonth = sp.group ? sp.month ?? monthOptions[monthOptions.length - 1] : null;

  let filteredChecks: typeof checks;
  if (effectiveMonth) {
    filteredChecks = checks.filter((c) => c.checked_on.slice(0, 7) === effectiveMonth);
  } else {
    // No group scope: keep only the most recent check per child+criterion instead of
    // blending every historical assessment together.
    const latestByKey = new Map<string, (typeof checks)[number]>();
    for (const c of checks) {
      const key = `${c.child_id}|${c.criterion_id}`;
      const existing = latestByKey.get(key);
      if (!existing || c.checked_on > existing.checked_on) latestByKey.set(key, c);
    }
    filteredChecks = Array.from(latestByKey.values());
  }
  const achievedSet = new Set(filteredChecks.map((c) => `${c.child_id}|${c.criterion_id}`));

  const sortedChildren = [...children].sort((a, b) => {
    const groupCmp = (a.groups?.name ?? "").localeCompare(b.groups?.name ?? "");
    return groupCmp !== 0 ? groupCmp : a.first_name.localeCompare(b.first_name);
  });

  const childSummaries = sortedChildren.map((child) => {
    const level = child.groups?.level ?? null;
    let levelCriteria = level ? criteria.filter((c) => c.level === level) : [];
    if (selectedCategory) levelCriteria = levelCriteria.filter((c) => c.category === selectedCategory);
    const total = levelCriteria.length;
    const achieved = levelCriteria.filter((c) => achievedSet.has(`${child.id}|${c.id}`)).length;
    const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
    return { child, level, total, achieved, pct, verdict: readinessVerdict(pct) };
  });

  const categoryTotals = CATEGORY_ORDER.map((cat) => {
    let total = 0;
    let achieved = 0;
    for (const child of children) {
      const level = child.groups?.level ?? null;
      if (!level) continue;
      const items = criteria.filter((c) => c.level === level && c.category === cat);
      total += items.length;
      achieved += items.filter((c) => achievedSet.has(`${child.id}|${c.id}`)).length;
    }
    return { category: cat, achieved, total };
  });

  const groupLabel = sp.group ? groups?.find((g) => g.id === sp.group)?.name ?? "" : "Бүх бүлэг";
  const yearLabel = sp.schoolYear ? ` · ${sp.schoolYear} хичээлийн жил` : "";

  let existingSummary = "";
  if (sp.group) {
    const { data: summaryRow } = await supabase
      .from("readiness_summaries")
      .select("content")
      .eq("group_id", sp.group)
      .maybeSingle();
    existingSummary = summaryRow?.content ?? "";
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Үр дүнгийн үнэлгээ</h1>
          <p className="mt-1 text-sm text-slate-500">
            "Суралцагчийн хөгжлийн үнэлгээний шалгуур"-ын дагуу хүүхэд бүрийн насны түвшинд нийцсэн
            Мэдлэг, Чадвар, Төлөвшлийн шалгуураар дүгнэнэ.
          </p>
        </div>
      </div>

      <form className="no-print mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {schoolYears.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500">Хичээлийн жил</label>
            <AutoSubmitSelect name="schoolYear" defaultValue={sp.schoolYear ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Бүх жил</option>
              {schoolYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500">Бүлэг</label>
          <AutoSubmitSelect name="group" defaultValue={sp.group ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Бүх бүлэг</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.school_year ? ` (${g.school_year})` : ""}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        {monthOptions.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500">Сар</label>
            <AutoSubmitSelect name="month" defaultValue={effectiveMonth ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
        )}
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white">
          Шүүх
        </button>
        <PrintButton />
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0 print:shadow-none">
        <h2 className="text-lg font-semibold text-slate-900">Нэгдсэн тойм</h2>
        <p className="text-sm text-slate-500">
          {groupLabel}
          {yearLabel}
          {effectiveMonth ? ` · ${formatMonthLabel(effectiveMonth)}` : ""} · Хамрагдсан хүүхэд: {children.length}
        </p>

        {children.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Тохирох хүүхэд олдсонгүй.</p>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800">Ангилал тус бүрийн эзэмшилт</h3>
              <CategoryAchievedBar data={categoryTotals} />
              <div className="no-print mt-3 flex flex-wrap gap-2">
                <Link
                  href={`?${new URLSearchParams({ ...(sp.group ? { group: sp.group } : {}), ...(sp.schoolYear ? { schoolYear: sp.schoolYear } : {}), ...(sp.month ? { month: sp.month } : {}) }).toString()}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    !selectedCategory
                      ? "bg-slate-800 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Нийт ({categoryTotals.reduce((s, c) => s + c.achieved, 0)}/
                  {categoryTotals.reduce((s, c) => s + c.total, 0)})
                </Link>
                {categoryTotals.map((c) => (
                  <Link
                    key={c.category}
                    href={`?${new URLSearchParams({ ...(sp.group ? { group: sp.group } : {}), ...(sp.schoolYear ? { schoolYear: sp.schoolYear } : {}), ...(sp.month ? { month: sp.month } : {}), category: c.category }).toString()}`}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      selectedCategory === c.category
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {c.category} ({c.achieved}/{c.total})
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-800">
                {selectedCategory ? `${selectedCategory} — хүүхэд тус бүрийн үр дүн` : "Хүүхэд тус бүрийн үр дүн"}
              </h3>
              <table className="mt-3 w-full min-w-[560px] border-collapse text-sm">
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
                  {childSummaries.map(({ child, total, achieved, pct, verdict }) => {
                    const vs = verdictStyle(verdict);
                    return (
                      <tr key={child.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-800">
                          {formatChildName(child.first_name, child.last_name)}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-600">{child.groups?.name}</td>
                        <td className="px-2 py-2 text-center">
                          {achieved}/{total}
                        </td>
                        <td className="px-2 py-2 text-center">{pct}%</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${vs.bg} ${vs.text}`}>
                            {verdict}
                          </span>
                        </td>
                        <td className="no-print px-2 py-2 text-center">
                          <Link href={`/assessment/result/${child.id}`} className="text-xs font-medium text-indigo-600 hover:underline">
                            Шалгах хуудас
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sp.group && (
              <div className="no-print mt-8 rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Жилийн эцсийн дүгнэлт</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {groupLabel}
                  {yearLabel} бүлгийн энэ хичээлийн жилийн Үр дүнгийн үнэлгээний нэгдсэн дүгнэлт — AI-аар
                  бэлтгэх эсвэл өөрөө шивж бичих боломжтой.
                </p>
                <GroupSummaryEditor
                  groupId={sp.group}
                  initialContent={existingSummary}
                  generateAction={generateReadinessSummaryDraft}
                  saveAction={saveReadinessSummary}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
