import { createClient } from "@/lib/supabase/server";
import {
  avgByDomain,
  monthlyTrend,
  availablePeriods,
  comparePeriods,
  periodLabel,
  type ObsRow,
} from "@/lib/analysis";
import { DomainRadar, MonthlyTrend, PeriodComparisonBar } from "@/components/AnalysisCharts";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    child?: string;
    year?: string;
    granularity?: string;
    periodA?: string;
    periodB?: string;
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
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name");

  let childrenQuery = supabase
    .from("children")
    .select("id, first_name, last_name, group_id, groups!inner(teacher_id)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");
  if (sp.group) childrenQuery = childrenQuery.eq("group_id", sp.group);
  const { data: children } = await childrenQuery;

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name, sort_order")
    .eq("teacher_id", user!.id)
    .order("sort_order");

  let obsQuery = supabase
    .from("observations")
    .select("domain_id, level, observed_on, children!inner(group_id, groups!inner(teacher_id))")
    .eq("children.groups.teacher_id", user!.id);
  if (sp.group) obsQuery = obsQuery.eq("children.group_id", sp.group);
  if (sp.child) obsQuery = obsQuery.eq("child_id", sp.child);

  const { data: rawRows } = await obsQuery;
  const rows: ObsRow[] = (rawRows ?? []).map((r) => ({
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
  const comparisonData =
    periodA && periodB ? comparePeriods(rows, domainList, granularity, periodA, periodB) : [];

  const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-900">Анализ дүгнэлт</h1>
      <p className="mt-1 text-sm text-slate-500">
        Суралцахуйн 7 чиглэлээр хийсэн ажиглалтын сар, улирлын дүн шинжилгээ, харьцуулалт.
      </p>

      <form className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select name="group" defaultValue={sp.group ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">Бүх бүлэг</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select name="child" defaultValue={sp.child ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">Бүлгийн дундаж (бүх хүүхэд)</option>
          {children?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.last_name ? `${c.last_name} ` : ""}
              {c.first_name}
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
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
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
                  <button type="submit" className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-white">
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
    </div>
  );
}
