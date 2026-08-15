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
      "*, children!inner(id, first_name, last_name, group_id, groups!inner(teacher_id, name)), learning_domains(name), observation_media(file_url, media_type)"
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

  const hasFilters = !!(group || child || domain || from || to);
  const newObsParams = new URLSearchParams();
  if (group) newObsParams.set("group", group);
  if (child) newObsParams.set("child", child);
  const newObsQuery = newObsParams.toString();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-500 to-teal-500 p-6 text-white shadow-lg shadow-indigo-200/60 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-100">
              🔄 Тогтмол ажиглалт
            </p>
            <h1 className="mt-1 text-2xl font-bold">Явцын үнэлгээ</h1>
            <p className="mt-1.5 max-w-lg text-sm text-indigo-100">
              Хичээлийн жилийн туршид суралцахуйн 7 чиглэл тус бүрээр тогтмол хийгдэх ажиглалт,
              тэмдэглэл, үнэлгээ.
            </p>
          </div>
          <Link
            href={newObsQuery ? `/assessment/yavts/new?${newObsQuery}` : "/assessment/yavts/new"}
            className="whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            + Явцын үнэлгээ нэмэх
          </Link>
        </div>
      </div>

      <form className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Бүлэг</label>
            <select
              name="group"
              defaultValue={group ?? ""}
              className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
            >
              <option value="">Бүх бүлэг</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Чиглэл</label>
            <select
              name="domain"
              defaultValue={domain ?? ""}
              className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
            >
              <option value="">Бүх чиглэл</option>
              {domains?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Эхлэх огноо</label>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Дуустал</label>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Шүүх
          </button>
          {hasFilters && (
            <Link
              href="/assessment/yavts"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              ✕ Цэвэрлэх
            </Link>
          )}
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {observations && observations.length > 0 ? (
          observations.map((o) => {
            const c = (
              o as unknown as { children: { id: string; first_name: string; last_name: string | null } }
            ).children;
            const domainName = (o as unknown as { learning_domains: { name: string } })
              .learning_domains?.name;
            const media = (
              o as unknown as { observation_media: { file_url: string; media_type: string }[] }
            ).observation_media;
            const dc = domainColor(domainName ?? "");
            const lv = o.level ? LEVEL_STYLES[o.level] : null;
            const initial = formatChildName(c.first_name, c.last_name)[0]?.toUpperCase() ?? "?";
            return (
              <div
                key={o.id}
                className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-indigo-200 hover:shadow-md"
                style={{ borderLeft: `4px solid ${dc.dot}` }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: dc.dot }}
                >
                  {initial}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/children/${c.id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-700"
                      >
                        {formatChildName(c.first_name, c.last_name)}
                      </Link>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${dc.bg} ${dc.text}`}>
                        {domainName}
                      </span>
                      <span className="text-xs text-slate-400">{o.observed_on}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {o.level && lv && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lv.bg} ${lv.text}`}
                        >
                          {LEVEL_LABELS[o.level]}
                        </span>
                      )}
                      <span className="opacity-0 transition group-hover:opacity-100">
                        <DeleteObservationButton id={o.id} childId={c.id} />
                      </span>
                    </div>
                  </div>

                  {o.note && <p className="mt-2 text-sm leading-relaxed text-slate-700">{o.note}</p>}

                  {media && media.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {media.slice(0, 6).map((m, i) =>
                        m.media_type === "video" ? (
                          <video
                            key={i}
                            src={m.file_url}
                            className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                            muted
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={m.file_url}
                            alt=""
                            className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-2 text-sm font-medium text-slate-500">Явцын үнэлгээ бүртгэгдээгүй байна.</p>
            <p className="mt-1 text-xs text-slate-400">
              {hasFilters
                ? "Шүүлтүүрээ өөрчилж дахин үзнэ үү."
                : "Дээрх \"+ Явцын үнэлгээ нэмэх\" товчоор эхлүүлээрэй."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
