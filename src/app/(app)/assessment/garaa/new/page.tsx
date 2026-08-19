import { createClient } from "@/lib/supabase/server";
import { createObservation } from "../../../observations/actions";
import ObservationForm from "@/components/ObservationForm";
import { formatChildName } from "@/lib/childName";

export default async function NewBaselineAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; child?: string }>;
}) {
  const { group, child } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let childrenQuery = supabase
    .from("children")
    .select("id, first_name, last_name, group_id, groups!inner(teacher_id, name, level)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");
  if (group) childrenQuery = childrenQuery.eq("group_id", group);
  const { data: children } = await childrenQuery;

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
      label: `${formatChildName(c.first_name, c.last_name)} · ${g?.name}`,
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
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-500 p-6 text-white shadow-lg shadow-indigo-200/60">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-100">
          🚩 Гарааны үнэлгээ
        </p>
        <h1 className="mt-1 text-xl font-bold">Гарааны үнэлгээ нэмэх</h1>
        <p className="mt-1.5 text-sm text-indigo-100">
          Суралцахуйн чиглэлээр анхны түвшинг тогтоож, баримт нотолгоо болгож зураг хавсаргана уу.
        </p>
      </div>
      <div className="mt-6">
        <ObservationForm
          action={createObservation}
          childOptions={childOptions}
          domainOptions={domains ?? []}
          outcomeOptions={outcomeOptions}
          defaultChildId={child}
          stage="garaa"
          noteLabel="Ажиглалтын тэмдэглэл, шалгуур"
          submitLabel="Гарааны үнэлгээ хадгалах"
        />
      </div>
    </div>
  );
}
