import { createClient } from "@/lib/supabase/server";
import {
  avgByDomain,
  monthlyTrend,
  availablePeriods,
  comparePeriods,
  periodLabel,
  type ObsRow,
} from "@/lib/analysis";
import {
  availableReadinessYears,
  compareReadinessByYear,
  type CriterionMeta,
  type ChildLevelMeta,
} from "@/lib/readinessAnalysis";
import { fetchAllAchievedChecks } from "@/lib/readiness";
import { DomainRadar, MonthlyTrend, PeriodComparisonBar, ReadinessYearComparisonBar } from "@/components/AnalysisCharts";
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

  let obsQuery = supabase
    .from("observations")
    .select("domain_id, level, observed_on, children!inner(group_id, groups!inner(teacher_id, school_year))")
    .eq("children.groups.teacher_id", user!.id)
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

      {yearRows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Сонгосон хугацаанд ажиглалтын мэдээлэл алга байна. Эхлээд Ажиглалт тэмдэглэл цэснээс
          бүртгэл хийнэ үү.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">
              {year} оны чиглэл тус бүрийн дундаж түвшин
            </h2>
            <DomainRadar data={radarData} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">
              {year} оны сар бүрийн хандлага
            </h2>
            <MonthlyTrend data={trendData} domainNames={domainNames} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">Хугацааны харьцуулалт</h2>
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

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Үр дүнгийн үнэлгээ — оноор харьцуулах</h2>
            <p className="text-xs text-slate-500">
              Мэдлэг, Чадвар, Төлөвшлийн ангилал тус бүрээр жил хоорондын эзэмшилтийн хувийг харьцуулна.
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
                  <p className="text-xs text-slate-500">{readinessComparison.labelA} — нийт эзэмшилт</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-800">{readinessComparison.overallPctA}%</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xs text-slate-500">{readinessComparison.labelB} — нийт эзэмшилт</p>
                  <p className="mt-1 text-2xl font-semibold text-green-700">{readinessComparison.overallPctB}%</p>
                </div>
              </div>
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
