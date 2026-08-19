import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DomainSettings from "@/components/DomainSettings";
import PrintButton from "@/components/PrintButton";
import { avgByDomain, type ObsRow } from "@/lib/analysis";
import { LEVEL_LABELS } from "@/types/database";
import { formatChildName } from "@/lib/childName";
import { groupTheme, LEVEL_STYLES } from "@/lib/colors";

function overallStats(avg: { domain: string; avg: number; count: number }[]) {
  const valid = avg.filter((a) => a.count > 0);
  if (valid.length === 0) return null;
  const overallAvg = valid.reduce((s, a) => s + a.avg, 0) / valid.length;
  const pct = Math.round((overallAvg / 4) * 100);
  const level = Math.min(4, Math.max(1, Math.round(overallAvg)));
  return { pct, level };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; child?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("*")
    .eq("teacher_id", user!.id)
    .order("sort_order");
  const domainList = domains ?? [];

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, level")
    .eq("teacher_id", user!.id)
    .order("name");

  if (!sp.group) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="no-print overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-400 p-6 text-white shadow-lg shadow-teal-200/60 sm:p-7">
          <Link href="/assessment" className="text-sm font-medium text-white/80 hover:text-white hover:underline">
            ← Үнэлгээ
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/80">
            🖨️ Тайлан
          </p>
          <h1 className="mt-1 text-2xl font-bold">Бүлгээ сонгоно уу</h1>
          <p className="mt-1.5 max-w-lg text-sm text-white/90">
            Хүүхдийн хөгжлийн тайланг харахын тулд эхлээд бүлгээ сонгоно уу.
          </p>
        </div>

        <div className="no-print mt-6">
          <DomainSettings domains={domainList} />
        </div>

        {groups && groups.length > 0 ? (
          <div className="no-print mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {groups.map((g) => {
              const theme = groupTheme(g.level);
              return (
                <Link
                  key={g.id}
                  href={`/reports?group=${g.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`h-2 w-full bg-gradient-to-r ${theme.from} ${theme.to}`} />
                  <div className="flex items-center gap-2.5 p-5">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} text-xl shadow-sm`}
                    >
                      {theme.emoji}
                    </span>
                    <span className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
                      {g.name}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="no-print mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Одоогоор бүлэг үүсгээгүй байна.{" "}
            <Link href="/children" className="font-medium text-indigo-600 hover:underline">
              Эхлээд бүлэг үүсгэнэ үү.
            </Link>
          </p>
        )}
      </div>
    );
  }

  let childrenQuery = supabase
    .from("children")
    .select("id, first_name, last_name, group_id, groups!inner(teacher_id)")
    .eq("groups.teacher_id", user!.id)
    .eq("group_id", sp.group)
    .order("first_name");
  if (sp.child) childrenQuery = childrenQuery.eq("id", sp.child);
  const { data: reportChildren } = await childrenQuery;

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toISOString()
    .slice(0, 10);
  const from = sp.from || defaultFrom;
  const to = sp.to || today;

  const childIds = (reportChildren ?? []).map((c) => c.id);

  let rowsByChild = new Map<string, ObsRow[]>();
  if (childIds.length > 0) {
    const { data: obsRows } = await supabase
      .from("observations")
      .select("child_id, domain_id, level, observed_on")
      .in("child_id", childIds)
      .not("level", "is", null)
      .gte("observed_on", from)
      .lte("observed_on", to);

    rowsByChild = new Map();
    for (const r of obsRows ?? []) {
      if (r.level === null) continue;
      const arr = rowsByChild.get(r.child_id) ?? [];
      arr.push({ domain_id: r.domain_id, level: r.level, observed_on: r.observed_on });
      rowsByChild.set(r.child_id, arr);
    }
  }

  const selectedGroup = groups?.find((g) => g.id === sp.group);
  const theme = groupTheme(selectedGroup?.level);

  return (
    <div className="mx-auto max-w-5xl">
      <div
        className={`no-print overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-6 text-white shadow-lg sm:p-7`}
      >
        <Link href="/reports" className="text-sm font-medium text-white/80 hover:text-white hover:underline">
          ← Бүх бүлэг
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/80">
          🖨️ Тайлан
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          <span>{theme.emoji}</span>
          {selectedGroup?.name ?? ""}
        </h1>
        <p className="mt-1.5 max-w-lg text-sm text-white/90">
          Тухайн хугацааны хөгжлийн тайланг үүсгэж хэвлэх/PDF татах.
        </p>
      </div>

      <div className="no-print mt-6">
        <DomainSettings domains={domainList} />
      </div>

      <form className="no-print mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input type="hidden" name="group" value={sp.group} />
        <div>
          <label className="block text-xs font-medium text-slate-500">Хүүхэд (заавал биш)</label>
          <select name="child" defaultValue={sp.child ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Бүгд</option>
            {reportChildren?.map((c) => (
              <option key={c.id} value={c.id}>
                {formatChildName(c.first_name, c.last_name)}
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
        <button
          type="submit"
          className={`rounded-lg bg-gradient-to-r ${theme.from} ${theme.to} px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95`}
        >
          Тайлан үүсгэх
        </button>
        <PrintButton />
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100 print:border-0 print:shadow-none">
        <div
          className={`border-b border-slate-100 p-6 print:border-0 print:bg-white print:p-0 ${theme.chip}`}
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Хүүхдийн хөгжлийн үнэлгээний тайлан
          </h2>
          <p className="text-sm text-slate-500">
            Хугацаа: {from} — {to} · {selectedGroup?.name ?? ""}
          </p>
        </div>
        <div className="p-6 print:p-0">

        {domainList.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Эхлээд дээрх хэсгээс чиглэл тохируулна уу.</p>
        ) : (reportChildren ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Тохирох хүүхэд олдсонгүй.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">Хүүхэд</th>
                  {domainList.map((d) => (
                    <th key={d.id} className="px-2 py-2 text-center font-medium">
                      {d.name}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium">Нийт дүн</th>
                  <th className="px-2 py-2 text-center font-medium">Хөгжлийн түвшин</th>
                  <th className="px-2 py-2 text-center font-medium">Ажиглалтын тоо</th>
                </tr>
              </thead>
              <tbody>
                {(reportChildren ?? []).map((c) => {
                  const rows = rowsByChild.get(c.id) ?? [];
                  const avg = avgByDomain(rows, domainList);
                  const stats = overallStats(avg);
                  const lv = stats ? LEVEL_STYLES[stats.level] : null;
                  return (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-800">
                        {formatChildName(c.first_name, c.last_name)}
                      </td>
                      {avg.map((a, i) => (
                        <td key={domainList[i].id} className="px-2 py-2 text-center text-slate-700">
                          {a.count > 0 ? a.avg.toFixed(1) : "—"}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-semibold text-slate-800">
                        {stats ? `${stats.pct}%` : "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {stats && lv ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lv.bg} ${lv.text}`}>
                            {LEVEL_LABELS[stats.level]}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-500">{rows.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sp.child && reportChildren && reportChildren.length === 1 && (
              <ChildNarrative
                rows={rowsByChild.get(reportChildren[0].id) ?? []}
                domains={domainList}
              />
            )}

            <p className="mt-4 text-xs text-slate-400">
              Түвшний тайлбар: 1 = {LEVEL_LABELS[1]}, 2 = {LEVEL_LABELS[2]}, 3 = {LEVEL_LABELS[3]}, 4 ={" "}
              {LEVEL_LABELS[4]}
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function ChildNarrative({
  rows,
  domains,
}: {
  rows: ObsRow[];
  domains: { id: string; name: string }[];
}) {
  if (rows.length === 0) return null;
  const avg = avgByDomain(rows, domains).filter((a) => a.count > 0);
  if (avg.length === 0) return null;
  const best = [...avg].sort((a, b) => b.avg - a.avg)[0];
  const worst = [...avg].sort((a, b) => a.avg - b.avg)[0];

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
      <p>
        <span className="font-semibold">Хамгийн сайн хөгжсөн чиглэл:</span> {best.domain} (дундаж{" "}
        {best.avg.toFixed(1)})
      </p>
      <p className="mt-1">
        <span className="font-semibold">Анхаарал шаардлагатай чиглэл:</span> {worst.domain} (дундаж{" "}
        {worst.avg.toFixed(1)})
      </p>
    </div>
  );
}
