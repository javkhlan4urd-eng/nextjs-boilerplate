import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatChildName } from "@/lib/childName";
import GroupsPanel from "@/components/GroupsPanel";
import { groupTheme } from "@/lib/colors";

const AVATAR_RING = [
  "from-rose-500 to-pink-400",
  "from-amber-500 to-orange-400",
  "from-teal-500 to-cyan-400",
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-lime-400",
  "from-sky-500 to-blue-400",
];

function calcAge(birthDate: string | null) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} нас ${months} сар`;
}

export default async function ChildrenPage({
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
    .select("*")
    .eq("teacher_id", user!.id)
    .order("name");

  const { data: allChildren } = await supabase
    .from("children")
    .select("id, group_id")
    .in("group_id", (groups ?? []).map((g) => g.id));

  const countByGroup: Record<string, number> = {};
  for (const c of allChildren ?? []) {
    countByGroup[c.group_id] = (countByGroup[c.group_id] ?? 0) + 1;
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-500 to-teal-500 p-8 text-white shadow-lg shadow-indigo-200">
          <p className="text-sm font-medium text-indigo-100">🏫 Бүлгүүд</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Бүлгээ сонгоно уу</h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            Тухайн бүлгийн хүүхдүүдийг харах, шинэ бүлэг үүсгэх, засах, устгах бүгдийг энд хийнэ.
          </p>
        </div>

        <GroupsPanel groups={groups ?? []} childCount={countByGroup} collapsible={false} />
      </div>
    );
  }

  const { data: children } = await supabase
    .from("children")
    .select("*, groups!inner(teacher_id, name)")
    .eq("groups.teacher_id", user!.id)
    .eq("group_id", group)
    .order("first_name");

  const selectedGroup = groups?.find((g) => g.id === group);
  const theme = groupTheme(selectedGroup?.level);

  return (
    <div className="mx-auto max-w-4xl">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-6 text-white shadow-lg`}
      >
        <div>
          <Link
            href="/children"
            className="text-sm font-medium text-white/80 hover:text-white hover:underline"
          >
            ← Бүх бүлэг
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <span>{theme.emoji}</span>
            {selectedGroup?.name ?? ""}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {children?.length ?? 0} хүүхэдтэй
            {selectedGroup?.school_year ? ` · ${selectedGroup.school_year}` : ""}
          </p>
        </div>
        <Link
          href={`/children/new?group=${group}`}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white/90"
        >
          + Хүүхэд нэмэх
        </Link>
      </div>

      <GroupsPanel groups={groups ?? []} childCount={countByGroup} />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children && children.length > 0 ? (
          children.map((c, i) => (
            <Link
              key={c.id}
              href={`/children/${c.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              {c.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.photo_url}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow"
                />
              ) : (
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white shadow-sm ${AVATAR_RING[i % AVATAR_RING.length]}`}
                >
                  {c.first_name?.[0] ?? "?"}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900">
                  {formatChildName(c.first_name, c.last_name)}
                </p>
                <p className="text-sm text-slate-500">
                  {(c as unknown as { groups: { name: string } }).groups?.name}
                  {c.birth_date ? ` · ${calcAge(c.birth_date)}` : ""}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="col-span-2 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Энэ бүлэгт хүүхэд алга. Дээрх товчоор хүүхэд нэмнэ үү.
          </p>
        )}
      </div>
    </div>
  );
}
