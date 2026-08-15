import { createClient } from "@/lib/supabase/server";
import DomainSettings from "@/components/DomainSettings";
import PrintButton from "@/components/PrintButton";
import { avgByDomain, type ObsRow } from "@/lib/analysis";
import { LEVEL_LABELS } from "@/types/database";
import { formatChildName } from "@/lib/childName";

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
  if (sp.child) childrenQuery = childrenQuery.eq("id", sp.child);
  const { data: reportChildren } = await childrenQuery;

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toISOString()
    .slice(0, 10);
  const from = sp.from || defaultFrom;
  const to = sp.to || today;

  const domainList = domains ?? [];
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

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="no-print text-xl font-semibold text-slate-900">Тайлан тохиргоо</h1>
      <p className="no-print mt-1 text-sm text-slate-500">
        Чиглэлийн тохиргоо хийх, тухайн хугацааны хөгжлийн тайланг үүсгэж хэвлэх/PDF татах.
      </p>

      <div className="no-print mt-6">
        <DomainSettings domains={domainList} />
      </div>

      <form className="no-print mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div>
          <label className="block text-xs font-medium text-slate-500">Бүлэг</label>
          <select name="group" defaultValue={sp.group ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Бүх бүлэг</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
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
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white">
          Тайлан үүсгэх
        </button>
        <PrintButton />
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Хүүхдийн хөгжлийн үнэлгээний тайлан
            </h2>
            <p className="text-sm text-slate-500">
              Хугацаа: {from} — {to}
              {sp.group ? ` · ${groups?.find((g) => g.id === sp.group)?.name ?? ""}` : ""}
            </p>
          </div>
        </div>

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
                  <th className="px-2 py-2 text-center font-medium">Ажиглалтын тоо</th>
                </tr>
              </thead>
              <tbody>
                {(reportChildren ?? []).map((c) => {
                  const rows = rowsByChild.get(c.id) ?? [];
                  const avg = avgByDomain(rows, domainList);
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
