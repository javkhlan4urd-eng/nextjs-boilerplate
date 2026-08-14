import { createClient } from "@/lib/supabase/server";
import { createFitnessTest } from "../actions";
import FitnessForm from "@/components/FitnessForm";

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
    label: `${c.last_name ? c.last_name + " " : ""}${c.first_name} · ${
      (c as unknown as { groups: { name: string } }).groups?.name
    }`,
    birthDate: c.birth_date,
    gender: c.gender as "эрэгтэй" | "эмэгтэй" | null,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Биеийн тамирын сорил нэмэх</h1>
      <p className="mt-1 text-sm text-slate-500">
        Хурд, Хүч, Авхаалж самбаа, Тэнцвэрийн сорилын үзүүлэлтийг оруулбал үнэлгээг автоматаар тооцно.
      </p>
      <div className="mt-6">
        <FitnessForm action={createFitnessTest} childOptions={childOptions} defaultChildId={child} />
      </div>
    </div>
  );
}
