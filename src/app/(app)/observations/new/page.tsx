import { createClient } from "@/lib/supabase/server";
import { createObservation } from "../actions";
import ObservationForm from "@/components/ObservationForm";

export default async function NewObservationPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: children } = await supabase
    .from("children")
    .select("id, first_name, last_name, groups!inner(teacher_id, name, level)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name, sort_order")
    .eq("teacher_id", user!.id)
    .order("sort_order");

  const { data: outcomes } = await supabase
    .from("learning_outcomes")
    .select("id, domain_id, level, code, description, learning_domains!inner(teacher_id)")
    .eq("learning_domains.teacher_id", user!.id)
    .order("sort_order");

  const childOptions = (children ?? []).map((c) => {
    const g = (c as unknown as { groups: { name: string; level: number | null } }).groups;
    return {
      id: c.id,
      label: `${c.last_name ? c.last_name + " " : ""}${c.first_name} · ${g?.name}`,
      groupLevel: g?.level ?? null,
    };
  });

  const outcomeOptions = (outcomes ?? []).map((o) => ({
    id: o.id,
    domain_id: o.domain_id,
    level: o.level,
    code: o.code,
    description: o.description,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Ажиглалт тэмдэглэл нэмэх</h1>
      <p className="mt-1 text-sm text-slate-500">
        Суралцахуйн 7 чиглэлийн аль нэгээр ажиглалт хийж, шаардлагатай бол зураг хавсаргана уу.
      </p>
      <div className="mt-6">
        <ObservationForm
          action={createObservation}
          childOptions={childOptions}
          domainOptions={domains ?? []}
          outcomeOptions={outcomeOptions}
          defaultChildId={child}
        />
      </div>
    </div>
  );
}
