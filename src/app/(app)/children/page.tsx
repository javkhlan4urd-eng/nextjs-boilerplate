import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatChildName } from "@/lib/childName";
import GroupsPanel from "@/components/GroupsPanel";

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

  let query = supabase
    .from("children")
    .select("*, groups!inner(teacher_id, name)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");

  if (group) query = query.eq("group_id", group);

  const { data: children } = await query;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Хүүхдүүд</h1>
          <p className="mt-1 text-sm text-slate-500">
            {group
              ? `${groups?.find((g) => g.id === group)?.name ?? ""} бүлгийн хүүхдүүд`
              : "Бүх бүлгийн хүүхдүүд"}
          </p>
        </div>
        <Link
          href={group ? `/children/new?group=${group}` : "/children/new"}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95"
        >
          + Хүүхэд нэмэх
        </Link>
      </div>

      <GroupsPanel groups={groups ?? []} childCount={countByGroup} />

      {groups && groups.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/children"
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
              href={`/children?group=${g.id}`}
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

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children && children.length > 0 ? (
          children.map((c) => (
            <Link
              key={c.id}
              href={`/children/${c.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
            >
              {c.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.photo_url}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-400 text-lg font-semibold text-white shadow-sm">
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
            Хүүхэд олдсонгүй. Эхлээд бүлэг үүсгээд хүүхэд нэмнэ үү.
          </p>
        )}
      </div>
    </div>
  );
}
