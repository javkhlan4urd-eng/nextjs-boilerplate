import { createClient } from "@/lib/supabase/server";
import { createFitnessTest } from "../actions";
import FitnessForm from "@/components/FitnessForm";
import { formatChildName } from "@/lib/childName";

export default async function NewFitnessTestPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; child?: string }>;
}) {
  const { group, child } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("children")
    .select("id, first_name, last_name, birth_date, gender, groups!inner(teacher_id, name)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");

  if (group) query = query.eq("group_id", group);

  const { data: children } = await query;

  const childOptions = (children ?? []).map((c) => ({
    id: c.id,
    label: `${formatChildName(c.first_name, c.last_name)} · ${
      (c as unknown as { groups: { name: string } }).groups?.name
    }`,
    birthDate: c.birth_date,
    gender: c.gender as "эрэгтэй" | "эмэгтэй" | null,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 p-6 text-white shadow-lg shadow-rose-200/60">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-rose-100">
          🏃 Биеийн тамир
        </p>
        <h1 className="mt-1 text-xl font-bold">Сорил нэмэх</h1>
        <p className="mt-1.5 text-sm text-rose-100">
          Хурд, Хүч, Авхаалж самбаа, Тэнцвэрийн сорилын үзүүлэлтийг оруулбал үнэлгээг автоматаар тооцно.
        </p>
      </div>
      <div className="mt-6">
        <FitnessForm action={createFitnessTest} childOptions={childOptions} defaultChildId={child} />
      </div>
    </div>
  );
}
