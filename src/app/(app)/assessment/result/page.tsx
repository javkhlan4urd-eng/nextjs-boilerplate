import { createClient } from "@/lib/supabase/server";
import { avgByDomain, type ObsRow } from "@/lib/analysis";
import { LEVEL_LABELS } from "@/types/database";
import PrintButton from "@/components/PrintButton";

export default async function ResultAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; schoolYear?: string }>;
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

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name, sort_order")
    .eq("teacher_id", user!.id)
    .order("sort_order");
  const domainList = domains ?? [];

  let childrenQuery = supabase
    .from("children")
    .select("id, first_name, last_name, group_id, groups!inner(teacher_id, name, school_year)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");
  if (sp.group) childrenQuery = childrenQuery.eq("group_id", sp.group);
  if (sp.schoolYear) childrenQuery = childrenQuery.eq("groups.school_year", sp.schoolYear);
  const { data: reportChildren } = await childrenQuery;

  const childIds = (reportChildren ?? []).map((c) => c.id);

  let garaaByChild = new Map<string, ObsRow[]>();
  let yavtsByChild = new Map<string, ObsRow[]>();

  if (childIds.length > 0) {
    const { data: rows } = await supabase
      .from("observations")
      .select("child_id, domain_id, level, observed_on, stage")
      .in("child_id", childIds)
      .in("stage", ["garaa", "yavts"]);

    for (const r of rows ?? []) {
      const target = r.stage === "garaa" ? garaaByChild : yavtsByChild;
      const arr = target.get(r.child_id) ?? [];
      arr.push({ domain_id: r.domain_id, level: r.level, observed_on: r.observed_on });
      target.set(r.child_id, arr);
    }
  }

  const groupLabel = sp.group ? groups?.find((g) => g.id === sp.group)?.name ?? "" : "Бүх бүлэг";
  const yearLabel = sp.schoolYear ? ` · ${sp.schoolYear} хичээлийн жил` : "";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Үр дүнгийн үнэлгээ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Явцын үнэлгээн дээр үндэслэн чиглэл тус бүрээр тооцоологдоно (Гараа → Үр дүн).
          </p>
        </div>
      </div>

      <form className="no-print mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
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
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white">
          Шүүх
        </button>
        <PrintButton />
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0 print:shadow-none">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Хүүхдийн үр дүнгийн үнэлгээ</h2>
          <p className="text-sm text-slate-500">
            {groupLabel}
            {yearLabel} · Формат: Гарааны дундаж → Явцын дундаж (Үр дүн)
          </p>
        </div>

        {domainList.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Эхлээд Тайлан тохиргоо хэсгээс чиглэл тохируулна уу.</p>
        ) : (reportChildren ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Тохирох хүүхэд олдсонгүй.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">Хүүхэд</th>
                  {domainList.map((d) => (
                    <th key={d.id} className="px-2 py-2 text-center font-medium">
                      {d.name}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium">Эцсийн үнэлгээ</th>
                </tr>
              </thead>
              <tbody>
                {(reportChildren ?? []).map((c) => {
                  const garaaRows = garaaByChild.get(c.id) ?? [];
                  const yavtsRows = yavtsByChild.get(c.id) ?? [];
                  const garaaAvg = avgByDomain(garaaRows, domainList);
                  const yavtsAvg = avgByDomain(yavtsRows, domainList);
                  const yavtsValues = yavtsAvg.filter((a) => a.count > 0).map((a) => a.avg);
                  const overall =
                    yavtsValues.length > 0
                      ? yavtsValues.reduce((s, v) => s + v, 0) / yavtsValues.length
                      : 0;
                  const overallLevel = overall > 0 ? Math.min(4, Math.max(1, Math.round(overall))) : null;

                  return (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-800">
                        {c.last_name ? `${c.last_name} ` : ""}
                        {c.first_name}
                      </td>
                      {domainList.map((d, i) => {
                        const g = garaaAvg[i];
                        const y = yavtsAvg[i];
                        return (
                          <td key={d.id} className="px-2 py-2 text-center text-slate-700">
                            {g.count > 0 ? g.avg.toFixed(1) : "—"}
                            {" → "}
                            {y.count > 0 ? y.avg.toFixed(1) : "—"}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-semibold text-slate-800">
                        {overallLevel ? LEVEL_LABELS[overallLevel] : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-slate-400">
              Түвшний тайлбар: 1 = {LEVEL_LABELS[1]}, 2 = {LEVEL_LABELS[2]}, 3 = {LEVEL_LABELS[3]}, 4 ={" "}
              {LEVEL_LABELS[4]}. Эцсийн үнэлгээ нь тухайн хүүхдийн бүх чиглэлийн явцын дундаж түвшнээс
              тооцогдоно.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
