import { createClient } from "@/lib/supabase/server";
import { avgByTest, levelDistribution, latestPerChild, type FitnessRow } from "@/lib/fitnessAnalysis";
import { TestAverageBar, LevelDistributionBar } from "@/components/FitnessCharts";
import PrintButton from "@/components/PrintButton";
import { formatChildName } from "@/lib/childName";

export default async function FitnessReportPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; year?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, school_year")
    .eq("teacher_id", user!.id)
    .order("name");

  const schoolYears = Array.from(
    new Set((groups ?? []).map((g) => g.school_year).filter((y): y is string => !!y))
  ).sort();

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toISOString()
    .slice(0, 10);
  const from = sp.from || defaultFrom;
  const to = sp.to || today;

  let query = supabase
    .from("fitness_tests")
    .select(
      "child_id, tested_on, age_group, gender, speed_score, strength_score, agility_score, balance_score, total_score, level, children!inner(id, first_name, last_name, group_id, groups!inner(teacher_id, name, school_year))"
    )
    .eq("children.groups.teacher_id", user!.id)
    .gte("tested_on", from)
    .lte("tested_on", to)
    .order("tested_on", { ascending: false });

  if (sp.group) query = query.eq("children.group_id", sp.group);
  if (sp.year) query = query.eq("children.groups.school_year", sp.year);

  const { data: rawRows } = await query;

  type RawRow = FitnessRow & {
    children: { id: string; first_name: string; last_name: string | null; group_id: string; groups: { name: string } };
  };
  const rows = (rawRows ?? []) as unknown as RawRow[];

  const testAvg = avgByTest(rows);
  const distribution = levelDistribution(rows);
  const latestMap = latestPerChild(rows);
  const latestRows = Array.from(latestMap.values()).sort((a, b) => {
    const ca = (a as RawRow).children;
    const cb = (b as RawRow).children;
    return (ca.last_name ?? "").localeCompare(cb.last_name ?? "") || ca.first_name.localeCompare(cb.first_name);
  }) as RawRow[];

  const groupLabel = sp.group ? groups?.find((g) => g.id === sp.group)?.name ?? "" : "Бүх бүлэг (нэгдсэн)";
  const yearLabel = sp.year ? ` · ${sp.year} хичээлийн жил` : "";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Биеийн тамирын сорил — үр дүн, анализ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Бүлэг бүрээр эсвэл бүх бүлгийн нэгдсэн байдлаар сорилын үр дүнг харна.
          </p>
        </div>
      </div>

      <form className="no-print mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div>
          <label className="block text-xs font-medium text-slate-500">Хичээлийн жил</label>
          <select name="year" defaultValue={sp.year ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Бүх жил</option>
            {schoolYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Бүлэг</label>
          <select name="group" defaultValue={sp.group ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Бүх бүлэг (нэгдсэн)</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.school_year ? ` (${g.school_year})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Эхлэх огноо</label>
          <input type="date" name="from" defaultValue={from} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Дуусах огноо</label>
          <input type="date" name="to" defaultValue={to} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white">
          Тайлан үүсгэх
        </button>
        <PrintButton />
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0 print:shadow-none">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Биеийн тамирын сорилын тайлан</h2>
          <p className="text-sm text-slate-500">
            {groupLabel}{yearLabel} · Хугацаа: {from} — {to} · Нийт сорил: {rows.length}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Сонгосон хугацаа, бүлэгт сорилын үр дүн олдсонгүй.
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Дундаж оноо сорил тус бүрээр (1-3)</h3>
                <TestAverageBar data={testAvg} />
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Үнэлгээний хуваарилалт</h3>
                <LevelDistributionBar data={distribution} />
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  {distribution.map((d) => (
                    <span key={d.level}>
                      {d.level}: {d.count} ({d.pct}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-800">Хүүхэд бүрийн сүүлийн үр дүн</h3>
              <table className="mt-3 w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 pr-3">Хүүхэд</th>
                    <th className="px-2 py-2">Бүлэг</th>
                    <th className="px-2 py-2 text-center">Огноо</th>
                    <th className="px-2 py-2 text-center">Хурд</th>
                    <th className="px-2 py-2 text-center">Хүч</th>
                    <th className="px-2 py-2 text-center">Авхаалж самбаа</th>
                    <th className="px-2 py-2 text-center">Тэнцвэр</th>
                    <th className="px-2 py-2 text-center">Нийт</th>
                    <th className="px-2 py-2 text-center">Үнэлгээ</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRows.map((r) => (
                    <tr key={r.child_id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-800">
                        {formatChildName(r.children.first_name, r.children.last_name)}
                      </td>
                      <td className="px-2 py-2 text-slate-600">{r.children.groups?.name}</td>
                      <td className="px-2 py-2 text-center text-slate-500">{r.tested_on}</td>
                      <td className="px-2 py-2 text-center">{r.speed_score ?? "—"}</td>
                      <td className="px-2 py-2 text-center">{r.strength_score ?? "—"}</td>
                      <td className="px-2 py-2 text-center">{r.agility_score ?? "—"}</td>
                      <td className="px-2 py-2 text-center">{r.balance_score ?? "—"}</td>
                      <td className="px-2 py-2 text-center font-medium">{r.total_score ?? "—"}/12</td>
                      <td className="px-2 py-2 text-center">{r.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate-400">
                Оноо: 3 = Маш сайн, 2 = Хангалттай, 1 = Дэмжлэг хэрэгтэй (сорил тус бүрээр)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
