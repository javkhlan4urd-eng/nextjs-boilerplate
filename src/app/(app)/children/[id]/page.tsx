import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChildDetail from "@/components/ChildDetail";
import { LEVEL_LABELS } from "@/types/database";
import { domainColor, LEVEL_STYLES, groupTheme } from "@/lib/colors";
import { formatChildName } from "@/lib/childName";

export default async function ChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("children")
    .select("*, groups(name, level)")
    .eq("id", id)
    .single();
  if (!child) notFound();

  const group = (child as unknown as { groups: { name: string; level: number | null } | null }).groups;
  const theme = groupTheme(group?.level);

  const { data: observations } = await supabase
    .from("observations")
    .select("*, learning_domains(name), observation_media(*)")
    .eq("child_id", id)
    .order("observed_on", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-6 text-white shadow-lg`}>
        <Link
          href={group?.name ? `/children?group=${child.group_id}` : "/children"}
          className="text-sm font-medium text-white/80 hover:text-white hover:underline"
        >
          ← {group?.name ?? "Хүүхдүүд"}
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          <span>{theme.emoji}</span>
          {formatChildName(child.first_name, child.last_name)}
        </h1>
      </div>

      <div className="mt-4">
        <ChildDetail child={child} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Ажиглалтын түүх</h2>
        <Link
          href={`/assessment/yavts/new?child=${id}`}
          className={`rounded-lg bg-gradient-to-r ${theme.from} ${theme.to} px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95`}
        >
          + Ажиглалт нэмэх
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {observations && observations.length > 0 ? (
          observations.map((o) => {
            const domainName = (o as unknown as { learning_domains: { name: string } })
              .learning_domains?.name;
            const dc = domainColor(domainName ?? "");
            const lv = o.level ? LEVEL_STYLES[o.level] : null;
            return (
            <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${dc.bg} ${dc.text}`}>
                    {domainName}
                  </span>
                  <span className="text-xs text-slate-500">{o.observed_on}</span>
                </div>
                {o.level && lv && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lv.bg} ${lv.text}`}>
                    {LEVEL_LABELS[o.level]}
                  </span>
                )}
              </div>
              {o.note && <p className="mt-2 text-sm text-slate-700">{o.note}</p>}
              {(o as unknown as { observation_media: { id: string; file_url: string; media_type: string }[] })
                .observation_media?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    o as unknown as {
                      observation_media: { id: string; file_url: string; media_type: string }[];
                    }
                  ).observation_media.map((m) =>
                    m.media_type === "video" ? (
                      <video
                        key={m.id}
                        src={m.file_url}
                        controls
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.id}
                        src={m.file_url}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    )
                  )}
                </div>
              )}
            </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Одоогоор ажиглалт бүртгээгүй байна.
          </p>
        )}
      </div>
    </div>
  );
}
