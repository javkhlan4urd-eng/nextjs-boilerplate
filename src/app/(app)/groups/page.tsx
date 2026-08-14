import { createClient } from "@/lib/supabase/server";
import { createGroup } from "./actions";
import GroupRow from "@/components/GroupRow";
import { GROUP_LEVEL_LABELS } from "@/lib/readiness";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .eq("teacher_id", user!.id)
    .order("created_at", { ascending: false });

  const { data: children } = await supabase.from("children").select("id, group_id");

  const countByGroup = new Map<string, number>();
  for (const c of children ?? []) {
    countByGroup.set(c.group_id, (countByGroup.get(c.group_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900">Бүлэг</h1>
      <p className="mt-1 text-sm text-slate-500">
        Өөрийн хариуцсан бүлгүүдээ энд үүсгэж удирдана.
      </p>

      <form
        action={createGroup}
        className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-slate-500">Бүлгийн нэр</label>
          <input
            name="name"
            required
            placeholder="Ж: Наран бүлэг"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-slate-500">Хичээлийн жил</label>
          <input
            name="school_year"
            placeholder="2025-2026"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-52">
          <label className="block text-xs font-medium text-slate-500">Насны түвшин</label>
          <select name="level" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">-- Сонгох --</option>
            {Object.entries(GROUP_LEVEL_LABELS).map(([lv, label]) => (
              <option key={lv} value={lv}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95"
        >
          + Бүлэг үүсгэх
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {groups && groups.length > 0 ? (
          groups.map((g) => (
            <GroupRow key={g.id} group={g} childCount={countByGroup.get(g.id) ?? 0} />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Одоогоор бүлэг үүсгээгүй байна. Дээрх маягтаар эхний бүлгээ үүсгэнэ үү.
          </p>
        )}
      </div>
    </div>
  );
}
