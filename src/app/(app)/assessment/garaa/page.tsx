import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABELS } from "@/types/database";
import { domainColor, LEVEL_STYLES } from "@/lib/colors";
import DeleteObservationButton from "@/components/DeleteObservationButton";

export default async function BaselineAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name");

  let query = supabase
    .from("observations")
    .select(
      "*, children!inner(id, first_name, last_name, group_id, groups!inner(teacher_id, name)), learning_domains(name)"
    )
    .eq("children.groups.teacher_id", user!.id)
    .eq("stage", "garaa")
    .order("observed_on", { ascending: false })
    .limit(200);

  if (group) query = query.eq("children.group_id", group);

  const { data: observations } = await query;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Гарааны үнэлгээ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Хичээлийн жилийн эхэнд суралцахуйн 7 чиглэл тус бүрээр анхны түвшинг тогтооно.
          </p>
        </div>
        <Link
          href={group ? `/assessment/garaa/new?group=${group}` : "/assessment/garaa/new"}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95"
        >
          + Гарааны үнэлгээ нэмэх
        </Link>
      </div>

      {groups && groups.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/assessment/garaa"
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              !group
                ? "bg-gradient-to-r from-indigo-600 to-teal-500 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Бүгд
          </Link>
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/assessment/garaa?group=${g.id}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                group === g.id
                  ? "bg-gradient-to-r from-indigo-600 to-teal-500 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {observations && observations.length > 0 ? (
          observations.map((o) => {
            const c = (
              o as unknown as { children: { id: string; first_name: string; last_name: string | null } }
            ).children;
            const domainName = (o as unknown as { learning_domains: { name: string } })
              .learning_domains?.name;
            const dc = domainColor(domainName ?? "");
            const lv = LEVEL_STYLES[o.level];
            return (
              <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/children/${c.id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                      {c.last_name ? `${c.last_name} ` : ""}
                      {c.first_name}
                    </Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${dc.bg} ${dc.text}`}>
                      {domainName}
                    </span>
                    <span className="text-xs text-slate-500">{o.observed_on}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lv.bg} ${lv.text}`}>
                      {LEVEL_LABELS[o.level]}
                    </span>
                    <DeleteObservationButton id={o.id} childId={c.id} />
                  </div>
                </div>
                {o.note && <p className="mt-2 text-sm text-slate-700">{o.note}</p>}
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Гарааны үнэлгээ бүртгэгдээгүй байна.
          </p>
        )}
      </div>
    </div>
  );
}
