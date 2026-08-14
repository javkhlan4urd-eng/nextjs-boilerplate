import { createClient } from "@/lib/supabase/server";
import { DomainCoverageBar, DomainDistributionBar } from "@/components/OutcomeCharts";
import PrintButton from "@/components/PrintButton";
import { CONCLUSION_THRESHOLD } from "@/lib/outcomeConclusion";

export default async function OutcomeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; schoolYear?: string; child?: string }>;
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
  }[] = [];
  if (childIds.length > 0) {
    const { data } = await supabase
      .from("outcome_conclusions")
      .select("child_id, outcome_id, conclusion, observation_count")
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

  const distributionByDomain = domainList.map((d) => ({
    domain: d.name,
    count: conclusions.filter((c) => {
      const o = outcomes.find((oo) => oo.id === c.outcome_id);
      return o?.domain_id === d.id;
    }).length,
  }));

  const selectedChild = sp.child ? children.find((c) => c.id === sp.child) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">СҮД дүгнэлтийн тайлан</h1>
          <p className="mt-1 text-sm text-slate-500">
            Суралцахуйн үр дүн (СҮД) тус бүрээр {CONCLUSION_THRESHOLD}+ тэмдэглэл цугласны дараа
            AI-аар автоматаар гарсан дүгнэлт, чиглэл бүрээр болон нэгдсэн байдлаар.
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
        <div>
          <label className="block text-xs font-medium text-slate-500">Хүүхэд (дэлгэрэнгүй)</label>
          <select name="child" defaultValue={sp.child ?? ""} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">-- Зөвхөн нэгдсэн тойм --</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.last_name ? `${c.last_name} ` : ""}
                {c.first_name}
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
        <h2 className="text-lg font-semibold text-slate-900">Чиглэл тус бүрийн нэгдсэн тойм</h2>
        <p className="text-sm text-slate-500">
          Хамрагдсан хүүхэд: {children.length} · Нийт СҮД дүгнэлт: {conclusions.length}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Чиглэл тус бүрийн хамрах хувь</h3>
            <DomainCoverageBar data={coverageByDomain} />
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Гарсан дүгнэлтийн тоо (чиглэлээр)</h3>
            <DomainDistributionBar data={distributionByDomain} />
          </div>
        </div>

        {selectedChild ? (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-slate-900">
              {selectedChild.last_name ? `${selectedChild.last_name} ` : ""}
              {selectedChild.first_name} — чиглэл тус бүрийн дэлгэрэнгүй дүгнэлт
            </h3>
            <div className="mt-4 space-y-6">
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
                        return (
                          <div key={o.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <p className="font-medium text-slate-700">
                              {o.code}: <span className="font-normal text-slate-600">{o.description}</span>
                            </p>
                            {conc ? (
                              <p className="mt-1 text-slate-800">
                                <span className="font-semibold text-emerald-700">Дүгнэлт:</span> {conc.conclusion}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-slate-400">
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
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            Тодорхой хүүхдийг сонговол чиглэл бүрийн СҮД-ийн дэлгэрэнгүй дүгнэлтийг текстээр харуулна.
          </p>
        )}
      </div>
    </div>
  );
}
