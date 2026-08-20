import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  avgByDomain,
  monthlyTrend,
  availablePeriods,
  comparePeriods,
  periodLabel,
  compareGaraaByGroup,
  type ObsRow,
  type GroupObsRow,
} from "@/lib/analysis";
import {
  availableReadinessYears,
  compareReadinessByYear,
  compareReadinessByGroup,
  READINESS_CATEGORIES,
  type CriterionMeta,
  type ChildLevelMeta,
  type GroupChildMeta,
} from "@/lib/readinessAnalysis";
import { fetchAllAchievedChecks } from "@/lib/readiness";
import {
  DomainRadar,
  MonthlyTrend,
  PeriodComparisonBar,
  ReadinessYearComparisonBar,
  GroupCategoryComparisonBar,
} from "@/components/AnalysisCharts";
import { formatChildName } from "@/lib/childName";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    child?: string;
    schoolYear?: string;
    year?: string;
    granularity?: string;
    periodA?: string;
    periodB?: string;
    readinessYearA?: string;
    readinessYearB?: string;
    garaaGroups?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentYear = new Date().getFullYear();
  const year = Number(sp.year) || currentYear;
  const granularity = sp.granularity === "quarter" ? "quarter" : "month";

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, school_year")
    .eq("teacher_id", user!.id)
    .order("name");

  const schoolYears = Array.from(
    new Set((groups ?? []).map((g) => g.school_year).filter((y): y is string => !!y))
  ).sort();

  let childrenQuery = supabase
    .from("children")
    .select("id, first_name, last_name, group_id, groups!inner(teacher_id, school_year, level)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");
  if (sp.group) childrenQuery = childrenQuery.eq("group_id", sp.group);
  if (sp.schoolYear) childrenQuery = childrenQuery.eq("groups.school_year", sp.schoolYear);
  const { data: childrenRaw } = await childrenQuery;
  const children = (childrenRaw ?? []) as unknown as {
    id: string;
    first_name: string;
    last_name: string | null;
    group_id: string;
    groups: { school_year: string | null; level: number | null };
  }[];
  const scopedChildIds = sp.child ? children.filter((c) => c.id === sp.child).map((c) => c.id) : children.map((c) => c.id);

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name, sort_order")
    .eq("teacher_id", user!.id)
    .order("sort_order");

  // Энэ хэсгийн дүн шинжилгээ (радар, сарын хандлага, хугацааны харьцуулалт) зөвхөн Явцын
  // үнэлгээнд (stage="yavts" эсвэл хуучин бичлэгүүдийн stage=null) үндэслэнэ — Гарааны
  // (эхлэлийн) нэг удаагийн үнэлгээг доор тусад нь бүлгээр харьцуулдаг тул энд оруулбал сар
  // бүрийн хандлагыг андуурна.
  let obsQuery = supabase
    .from("observations")
    .select("domain_id, level, observed_on, children!inner(group_id, groups!inner(teacher_id, school_year))")
    .eq("children.groups.teacher_id", user!.id)
    .or("stage.eq.yavts,stage.is.null")
    .not("level", "is", null);
  if (sp.group) obsQuery = obsQuery.eq("children.group_id", sp.group);
  if (sp.child) obsQuery = obsQuery.eq("child_id", sp.child);
  if (sp.schoolYear) obsQuery = obsQuery.eq("children.groups.school_year", sp.schoolYear);

  const { data: rawRows } = await obsQuery;
  const rows: ObsRow[] = (rawRows ?? [])
    .filter((r): r is typeof r & { level: number } => r.level !== null)
    .map((r) => ({
      domain_id: r.domain_id,
      level: r.level,
      observed_on: r.observed_on,
    }));
  const yearRows = rows.filter((r) => new Date(r.observed_on).getFullYear() === year);

  const domainList = domains ?? [];
  const radarData = avgByDomain(yearRows, domainList);
  const trendData = monthlyTrend(rows, domainList, year);
  const domainNames = domainList.map((d) => d.name);

  const periods = availablePeriods(rows, granularity);
  const periodA = sp.periodA && periods.includes(sp.periodA) ? sp.periodA : periods[periods.length - 2];
  const periodB = sp.periodB && periods.includes(sp.periodB) ? sp.periodB : periods[periods.length - 1];

  const { data: criteriaRaw } = await supabase
    .from("readiness_criteria")
    .select("id, level, category")
    .eq("teacher_id", user!.id);
  const criteria: CriterionMeta[] = criteriaRaw ?? [];

  const readinessChecks = await fetchAllAchievedChecks(supabase, scopedChildIds);

  const readinessChildren: ChildLevelMeta[] = children
    .filter((c) => scopedChildIds.includes(c.id))
    .map((c) => ({ id: c.id, level: c.groups?.level ?? null }));

  const readinessYears = availableReadinessYears(readinessChecks);
  const readinessYearA =
    sp.readinessYearA && readinessYears.includes(sp.readinessYearA)
      ? sp.readinessYearA
      : readinessYears[readinessYears.length - 2];
  const readinessYearB =
    sp.readinessYearB && readinessYears.includes(sp.readinessYearB)
      ? sp.readinessYearB
      : readinessYears[readinessYears.length - 1];
  const readinessComparison =
    readinessYearA && readinessYearB
      ? compareReadinessByYear(readinessChecks, criteria, readinessChildren, readinessYearA, readinessYearB)
      : null;
  const comparisonData =
    periodA && periodB ? comparePeriods(rows, domainList, granularity, periodA, periodB) : [];

  const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  // Бүх бүлгийг (хуудасны Бүлэг/Хүүхэд шүүлтээс үл хамааран) харьцуулахын тулд тусад нь бүх
  // хүүхдийг татна — учир нь дээрх scopedChildIds аль хэдийн сонгосон бүлгээр шүүгдсэн байдаг.
  const { data: allChildrenRaw } = await supabase
    .from("children")
    .select("id, group_id, groups!inner(teacher_id, name, school_year, level)")
    .eq("groups.teacher_id", user!.id);
  const allChildrenForGroupCompare: GroupChildMeta[] = (allChildrenRaw ?? []).map((c) => {
    const g = (c as unknown as { groups: { name: string; school_year: string | null; level: number | null } }).groups;
    return { id: c.id, level: g?.level ?? null, groupId: c.group_id, groupName: g?.name ?? "", schoolYear: g?.school_year ?? null };
  });
  const allChecksForGroupCompare = await fetchAllAchievedChecks(
    supabase,
    allChildrenForGroupCompare.map((c) => c.id)
  );
  const groupReadinessComparison = compareReadinessByGroup(allChecksForGroupCompare, criteria, allChildrenForGroupCompare);
  const groupCategoryChartData = READINESS_CATEGORIES.map((cat) => {
    const row: Record<string, number | string> = { category: cat };
    for (const g of groupReadinessComparison) {
      const label = `${g.groupName}${g.schoolYear ? ` (${g.schoolYear})` : ""}`;
      row[label] = g.categoryPct[cat];
    }
    return row;
  });
  const groupChartKeys = groupReadinessComparison.map((g) => `${g.groupName}${g.schoolYear ? ` (${g.schoolYear})` : ""}`);

  // Гарааны үнэлгээ (stage="garaa") — мөн бүх бүлгийг (шүүлтээс үл хамааран) суралцахуйн
  // чиглэл тус бүрээр харьцуулна.
  const { data: allGaraaRaw } = await supabase
    .from("observations")
    .select(
      "domain_id, level, observed_on, children!inner(group_id, groups!inner(teacher_id, name, school_year))"
    )
    .eq("children.groups.teacher_id", user!.id)
    .eq("stage", "garaa")
    .not("level", "is", null);
  const allGaraaRows: GroupObsRow[] = (allGaraaRaw ?? [])
    .filter((r): r is typeof r & { level: number } => r.level !== null)
    .map((r) => {
      const c = (
        r as unknown as { children: { group_id: string; groups: { name: string; school_year: string | null } } }
      ).children;
      return {
        domain_id: r.domain_id,
        level: r.level,
        observed_on: r.observed_on,
        groupId: c.group_id,
        groupName: c.groups?.name ?? "",
        schoolYear: c.groups?.school_year ?? null,
      };
    });
  const groupGaraaComparisonRaw = compareGaraaByGroup(allGaraaRows, domainList);
  const garaaStatsByGroupId = new Map(groupGaraaComparisonRaw.map((g) => [g.groupId, g]));
  const allGroupGaraaStats = (groups ?? []).map((g) => {
    const existing = garaaStatsByGroupId.get(g.id);
    if (existing) return existing;
    const emptyDomainPct: Record<string, number> = {};
    for (const d of domainList) emptyDomainPct[d.name] = 0;
    return {
      groupId: g.id,
      groupName: g.name,
      schoolYear: g.school_year,
      domainPct: emptyDomainPct,
      overallPct: 0,
      count: 0,
    };
  });
  const allGaraaGroupIds = allGroupGaraaStats.map((g) => g.groupId);
  const selectedGaraaGroupIds =
    sp.garaaGroups === "none" ? [] : sp.garaaGroups ? sp.garaaGroups.split(",").filter(Boolean) : allGaraaGroupIds;
  const groupGaraaComparison = allGroupGaraaStats.filter((g) => selectedGaraaGroupIds.includes(g.groupId));

  function garaaGroupsHref(nextIds: string[]) {
    const params = new URLSearchParams();
    if (sp.group) params.set("group", sp.group);
    if (sp.child) params.set("child", sp.child);
    if (sp.schoolYear) params.set("schoolYear", sp.schoolYear);
    if (sp.year) params.set("year", sp.year);
    if (sp.granularity) params.set("granularity", sp.granularity);
    if (nextIds.length === 0) params.set("garaaGroups", "none");
    else if (nextIds.length < allGaraaGroupIds.length) params.set("garaaGroups", nextIds.join(","));
    return `?${params.toString()}`;
  }

  const groupGaraaWithData = groupGaraaComparison.filter((g) => g.count > 0);
  const groupGaraaChartData = domainList.map((d) => {
    const row: Record<string, number | string> = { category: d.name };
    for (const g of groupGaraaWithData) {
      row[`${g.groupName}${g.schoolYear ? ` (${g.schoolYear})` : ""}`] = g.domainPct[d.name] ?? 0;
    }
    return row;
  });
  const groupGaraaChartKeys = groupGaraaWithData.map((g) => `${g.groupName}${g.schoolYear ? ` (${g.schoolYear})` : ""}`);

  // Гарааны (хичээлийн жилийн эхэнд тогтоосон) болон Үр дүнгийн (одоогийн эцсийн) үнэлгээ хоёр
  // өөр аргачлалтай ч (7 чиглэл 1-4 түвшин / Мэдлэг-Чадвар-Төлөвшил шалгуур) хоёулаа 0-100%
  // хэлбэрт шилжсэн тул бүлэг тус бүрийн эхлэл→эцсийн ерөнхий ахицыг харьцуулж болно.
  const garaaVsResultStats = allGroupGaraaStats.map((g) => {
    const result = groupReadinessComparison.find((r) => r.groupId === g.groupId);
    return {
      groupId: g.groupId,
      groupName: g.groupName,
      schoolYear: g.schoolYear,
      garaaPct: g.count > 0 ? g.overallPct : null,
      resultPct: result ? result.overallPct : null,
    };
  });
  const garaaVsResultChartData = garaaVsResultStats
    .filter((g) => g.garaaPct !== null || g.resultPct !== null)
    .map((g) => ({
      category: `${g.groupName}${g.schoolYear ? ` (${g.schoolYear})` : ""}`,
      "Гарааны үнэлгээ": g.garaaPct ?? 0,
      "Үр дүнгийн үнэлгээ": g.resultPct ?? 0,
    }));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-500 to-violet-500 p-6 text-white shadow-lg shadow-purple-200/60 sm:p-7">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-purple-100">
          📊 Анализ
        </p>
        <h1 className="mt-1 text-2xl font-bold">Анализ дүгнэлт</h1>
        <p className="mt-1.5 max-w-lg text-sm text-purple-100">
          Суралцахуйн 7 чиглэлээр хийсэн ажиглалтын сар, улирлын дүн шинжилгээ, харьцуулалт.
        </p>
      </div>

      <form className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {schoolYears.length > 0 && (
          <select name="schoolYear" defaultValue={sp.schoolYear ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Бүх хичээлийн жил</option>
            {schoolYears.map((y) => (
              <option key={y} value={y}>
                {y} хичээлийн жил
              </option>
            ))}
          </select>
        )}
        <select name="group" defaultValue={sp.group ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">Бүх бүлэг</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.school_year ? ` (${g.school_year})` : ""}
            </option>
          ))}
        </select>
        <select name="child" defaultValue={sp.child ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">Бүлгийн дундаж (бүх хүүхэд)</option>
          {children?.map((c) => (
            <option key={c.id} value={c.id}>
              {formatChildName(c.first_name, c.last_name)}
            </option>
          ))}
        </select>
        <select name="year" defaultValue={String(year)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {years.map((y) => (
            <option key={y} value={y}>
              {y} он
            </option>
          ))}
        </select>
        <select name="granularity" defaultValue={granularity} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="month">Сараар харьцуулах</option>
          <option value="quarter">Улирлаар харьцуулах</option>
        </select>
        <button type="submit" className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
          Шүүх
        </button>
      </form>

      <div className="mt-6">
        <h2 className="text-base font-semibold text-slate-900">🔄 Явцын үнэлгээ — чиглэл, хугацааны дүн шинжилгээ</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Доорх 3 диаграм зөвхөн Явцын үнэлгээний (тогтмол хийгддэг ажиглалт) дата дээр үндэслэнэ — Гарааны
          (эхлэлийн, нэг удаагийн) үнэлгээ доор тусад нь, бүлгээр харьцуулагдана.
        </p>
      </div>

      {yearRows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Сонгосон хугацаанд Явцын үнэлгээний мэдээлэл алга байна. Эхлээд Ажиглалт тэмдэглэл цэснээс
          бүртгэл хийнэ үү.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Суралцахуйн чиглэл тус бүрийн хөгжлийн дундаж түвшин ({year} он, Явцын үнэлгээ)
            </h3>
            <DomainRadar data={radarData} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Хөгжлийн түвшний сар тутмын хандлага ({year} он, Явцын үнэлгээ)
            </h3>
            <MonthlyTrend data={trendData} domainNames={domainNames} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Хугацааны харьцуулалт (Явцын үнэлгээ)</h3>
              {periods.length >= 2 && (
                <form className="flex flex-wrap gap-2">
                  <input type="hidden" name="group" value={sp.group ?? ""} />
                  <input type="hidden" name="schoolYear" value={sp.schoolYear ?? ""} />
                  <input type="hidden" name="child" value={sp.child ?? ""} />
                  <input type="hidden" name="year" value={String(year)} />
                  <input type="hidden" name="granularity" value={granularity} />
                  <select name="periodA" defaultValue={periodA} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                    {periods.map((p) => (
                      <option key={p} value={p}>
                        {periodLabel(p, granularity)}
                      </option>
                    ))}
                  </select>
                  <span className="self-center text-xs text-slate-400">→</span>
                  <select name="periodB" defaultValue={periodB} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                    {periods.map((p) => (
                      <option key={p} value={p}>
                        {periodLabel(p, granularity)}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-500 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-95">
                    Харьцуулах
                  </button>
                </form>
              )}
            </div>
            {periods.length >= 2 && periodA && periodB ? (
              <PeriodComparisonBar
                data={comparisonData}
                keys={[periodLabel(periodA, granularity), periodLabel(periodB, granularity)]}
              />
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Харьцуулахын тулд дор хаяж 2 өөр {granularity === "month" ? "сарын" : "улирлын"}{" "}
                ажиглалт хэрэгтэй.
              </p>
            )}
          </div>
        </div>
      )}

      {allGroupGaraaStats.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Бүлгүүдийн Гарааны үнэлгээ — чиглэлээр харьцуулах
          </h2>
          <p className="text-xs text-slate-500">
            Дунд, Ахлах, Бэлтгэл зэрэг бүлгүүдээ сонгож, тэдгээрийн (өөрийн хичээлийн жилтэй нь хамт) Гарааны
            үнэлгээг суралцахуйн 7 чиглэл тус бүрээр зэрэгцүүлж харьцуулна.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={garaaGroupsHref(allGaraaGroupIds)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedGaraaGroupIds.length === allGaraaGroupIds.length
                  ? "bg-gradient-to-r from-fuchsia-600 to-violet-500 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              Бүгд
            </Link>
            {allGroupGaraaStats.map((g) => {
              const active = selectedGaraaGroupIds.includes(g.groupId);
              const nextIds = active
                ? selectedGaraaGroupIds.filter((id) => id !== g.groupId)
                : [...selectedGaraaGroupIds, g.groupId];
              return (
                <Link
                  key={g.groupId}
                  href={garaaGroupsHref(nextIds)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    active
                      ? "bg-gradient-to-r from-fuchsia-600 to-violet-500 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {g.groupName}
                  {g.count === 0 ? " (мэдээлэл алга)" : ""}
                </Link>
              );
            })}
          </div>

          {groupGaraaComparison.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Харьцуулах бүлгээ сонгоно уу.
            </p>
          ) : (
            <>
              {groupGaraaWithData.length > 0 ? (
                <div className="mt-4">
                  <GroupCategoryComparisonBar data={groupGaraaChartData} groupKeys={groupGaraaChartKeys} />
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Сонгосон бүлгүүдэд Гарааны (эхлэлийн) үе шатны ажиглалт бүртгэгдээгүй байна.
                </p>
              )}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="py-2 pr-3">Бүлэг</th>
                      <th className="px-2 py-2 text-center">Хичээлийн жил</th>
                      {domainList.map((d) => (
                        <th key={d.id} className="px-2 py-2 text-center">
                          {d.name}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center">Нийт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupGaraaComparison.map((g) => (
                      <tr key={g.groupId} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-800">{g.groupName}</td>
                        <td className="px-2 py-2 text-center text-slate-500">{g.schoolYear ?? "—"}</td>
                        {domainList.map((d) => (
                          <td key={d.id} className="px-2 py-2 text-center">
                            {g.count > 0 ? `${g.domainPct[d.name] ?? 0}%` : "—"}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center font-semibold">
                          {g.count > 0 ? `${g.overallPct}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-400">
                  "—" тэмдэглэгээ нь тухайн бүлэгт Гарааны (эхлэлийн) үе шатны ажиглалт хараахан
                  бүртгэгдээгүй байгааг илэрхийлнэ.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {groupReadinessComparison.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Бүлгүүдийн үр дүнгийн үнэлгээ — ангиллаар харьцуулах
          </h2>
          <p className="text-xs text-slate-500">
            Бүх бүлгийн (өөрийн хичээлийн жилтэй нь хамт) Мэдлэг, Чадвар, Төлөвшлийн эзэмшилтийн хувийг зэрэгцүүлж
            харьцуулна.
          </p>
          <div className="mt-4">
            <GroupCategoryComparisonBar data={groupCategoryChartData} groupKeys={groupChartKeys} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">Бүлэг</th>
                  <th className="px-2 py-2 text-center">Хичээлийн жил</th>
                  <th className="px-2 py-2 text-center">Мэдлэг</th>
                  <th className="px-2 py-2 text-center">Чадвар</th>
                  <th className="px-2 py-2 text-center">Төлөвшил</th>
                  <th className="px-2 py-2 text-center">Нийт</th>
                  <th className="px-2 py-2 text-center">Хүүхэд</th>
                </tr>
              </thead>
              <tbody>
                {groupReadinessComparison.map((g) => (
                  <tr key={g.groupId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-800">{g.groupName}</td>
                    <td className="px-2 py-2 text-center text-slate-500">{g.schoolYear ?? "—"}</td>
                    <td className="px-2 py-2 text-center">{g.categoryPct["Мэдлэг"]}%</td>
                    <td className="px-2 py-2 text-center">{g.categoryPct["Чадвар"]}%</td>
                    <td className="px-2 py-2 text-center">{g.categoryPct["Төлөвшил"]}%</td>
                    <td className="px-2 py-2 text-center font-semibold">{g.overallPct}%</td>
                    <td className="px-2 py-2 text-center text-slate-500">{g.childCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {garaaVsResultStats.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Гараа — Үр дүнгийн хоорондын ахиц</h2>
          <p className="text-xs text-slate-500">
            Хичээлийн жилийн эхний Гарааны үнэлгээнээс одоогийн Үр дүнгийн үнэлгээ хүртэл бүлэг тус бүрийн
            ерөнхий ахицыг харуулна (хоёулаа 0-100% хэлбэрт шилжүүлсэн).
          </p>
          {garaaVsResultChartData.length > 0 && (
            <div className="mt-4">
              <ReadinessYearComparisonBar
                data={garaaVsResultChartData}
                keys={["Гарааны үнэлгээ", "Үр дүнгийн үнэлгээ"]}
              />
            </div>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">Бүлэг</th>
                  <th className="px-2 py-2 text-center">Хичээлийн жил</th>
                  <th className="px-2 py-2 text-center">Гараа</th>
                  <th className="px-2 py-2 text-center">Үр дүн</th>
                  <th className="px-2 py-2 text-center">Ахиц</th>
                </tr>
              </thead>
              <tbody>
                {garaaVsResultStats.map((g) => {
                  const delta = g.garaaPct !== null && g.resultPct !== null ? g.resultPct - g.garaaPct : null;
                  return (
                    <tr key={g.groupId} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-800">{g.groupName}</td>
                      <td className="px-2 py-2 text-center text-slate-500">{g.schoolYear ?? "—"}</td>
                      <td className="px-2 py-2 text-center">{g.garaaPct !== null ? `${g.garaaPct}%` : "—"}</td>
                      <td className="px-2 py-2 text-center">{g.resultPct !== null ? `${g.resultPct}%` : "—"}</td>
                      <td className="px-2 py-2 text-center font-semibold">
                        {delta !== null ? (
                          <span className={delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {delta >= 0 ? "+" : ""}
                            {delta} нэгж
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-400">
              "—" тэмдэглэгээ нь тухайн бүлэгт Гараа эсвэл Үр дүнгийн үнэлгээ хараахан бүртгэгдээгүй
              байгааг илэрхийлнэ; ийм тохиолдолд ахиц тооцоологдохгүй.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Үр дүнгийн үнэлгээ — оноор харьцуулах</h2>
            <p className="text-xs text-slate-500">
              Мэдлэг, Чадвар, Төлөвшлийн ангилал тус бүрээр сонгосон он бүрийн эцэс хүртэл хуримтлагдсан
              эзэмшилтийн хувийг харьцуулна.
            </p>
          </div>
          {readinessYears.length >= 2 && (
            <form className="flex flex-wrap gap-2">
              <input type="hidden" name="group" value={sp.group ?? ""} />
              <input type="hidden" name="schoolYear" value={sp.schoolYear ?? ""} />
              <input type="hidden" name="child" value={sp.child ?? ""} />
              <input type="hidden" name="year" value={String(year)} />
              <input type="hidden" name="granularity" value={granularity} />
              <select name="readinessYearA" defaultValue={readinessYearA} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                {readinessYears.map((y) => (
                  <option key={y} value={y}>
                    {y} он
                  </option>
                ))}
              </select>
              <span className="self-center text-xs text-slate-400">→</span>
              <select name="readinessYearB" defaultValue={readinessYearB} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                {readinessYears.map((y) => (
                  <option key={y} value={y}>
                    {y} он
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-500 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-95">
                Харьцуулах
              </button>
            </form>
          )}
        </div>

        {readinessYears.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Сонгосон хамрах хүрээнд үр дүнгийн үнэлгээний мэдээлэл алга байна.
          </p>
        ) : readinessYears.length < 2 ? (
          <p className="mt-4 text-sm text-slate-500">
            Жил хоорондын харьцуулалт хийхийн тулд дор хаяж 2 өөр оны үнэлгээ хэрэгтэй. Одоогоор зөвхөн{" "}
            {readinessYears[0]} оны мэдээлэл бүртгэгдсэн байна.
          </p>
        ) : (
          readinessComparison && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">{readinessComparison.labelA} хүртэл хуримтлагдсан эзэмшилт</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-800">{readinessComparison.overallPctA}%</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xs text-slate-500">{readinessComparison.labelB} хүртэл хуримтлагдсан эзэмшилт</p>
                  <p className="mt-1 text-2xl font-semibold text-green-700">{readinessComparison.overallPctB}%</p>
                </div>
              </div>
              <p className="mt-3 text-center text-sm text-slate-600">
                {readinessComparison.labelA}-с {readinessComparison.labelB} хүртэлх ахиц:{" "}
                <span
                  className={
                    readinessComparison.overallPctB - readinessComparison.overallPctA >= 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-rose-600"
                  }
                >
                  {readinessComparison.overallPctB - readinessComparison.overallPctA >= 0 ? "+" : ""}
                  {readinessComparison.overallPctB - readinessComparison.overallPctA} нэгж
                </span>
              </p>
              <ReadinessYearComparisonBar
                data={readinessComparison.categoryData}
                keys={[readinessComparison.labelA, readinessComparison.labelB]}
              />
            </>
          )
        )}
      </div>
    </div>
  );
}
