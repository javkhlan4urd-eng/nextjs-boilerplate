import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABELS } from "@/types/database";
import { domainColor, LEVEL_STYLES } from "@/lib/colors";
import DeleteObservationButton from "@/components/DeleteObservationButton";
import { formatChildName } from "@/lib/childName";

export default async function ProgressAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    child?: string;
    domain?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { group, child, domain, from, to } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name");

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("sort_order");

  let query = supabase
    .from("observations")
    .select(
      "*, children!inner(id, first_name, last_name, group_id, groups!inner(teacher_id, name)), learning_domains(name)"
    )
    .eq("children.groups.teacher_id", user!.id)
    .or("stage.eq.yavts,stage.is.null")
    .order("observed_on", { ascending: false })
    .limit(200);

  if (group) query = query.eq("children.group_id", group);
  if (child) query = query.eq("child_id", child);
  if (domain) query = query.eq("domain_id", domain);
  if (from) query = query.gte("observed_on", from);
  if (to) query = query.lte("observed_on", to);

  const { data: observations } = await query;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Явцын үнэлгээ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Хичээлийн жилийн туршид суралцахуйн 7 чиглэл тус бүрээр тогтмол хийгдэх ажиглалт, тэмдэглэл, үнэлгээ.
          </p>
        </div>
        <Link
          href={child ? `/assessment/yavts/new?child=${child}` : "/assessment/yavts/new"}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95"
        >
          + Явцын үнэлгээ нэмэх
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select
          name="group"
          defaultValue={group ?? ""}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Бүх бүлэг</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          name="domain"
          defaultValue={domain ?? ""}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Бүх чиглэл</option>
          {domains?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={from ?? ""}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={to ?? ""}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
        >
          Шүүх
        </button>
        <Link
          href="/assessment/yavts"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Цэвэрлэх
        </Link>
      </form>

      <div className="mt-4 space-y-3">
        {observations && observations.length > 0 ? (
          observations.map((o) => {
            const c = (
              o as unknown as { children: { id: string; first_name: string; last_name: string | null } }
            ).children;
            const domainName = (o as unknown as { learning_domains: { name: string } })
              .learning_domains?.name;
            const dc = domainColor(domainName ?? "");
            const lv = o.level ? LEVEL_STYLES[o.level] : null;
            return (
              <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/children/${c.id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                      {formatChildName(c.first_name, c.last_name)}
                    </Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${dc.bg} ${dc.text}`}>
                      {domainName}
                    </span>
                    <span className="text-xs text-slate-500">{o.observed_on}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.level && lv && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lv.bg} ${lv.text}`}>
                        {LEVEL_LABELS[o.level]}
                      </span>
                    )}
                    <DeleteObservationButton id={o.id} childId={c.id} />
                  </div>
                </div>
                {o.note && <p className="mt-2 text-sm text-slate-700">{o.note}</p>}
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Явцын үнэлгээ бүртгэгдээгүй байна.
          </p>
        )}
      </div>
    </div>
  );
}
