import { createClient } from "@/lib/supabase/server";
import { createObservation } from "../../../observations/actions";
import ObservationForm from "@/components/ObservationForm";

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
    .select("id, first_name, last_name, groups!inner(teacher_id, name)")
    .eq("groups.teacher_id", user!.id)
    .order("first_name");
  if (group) childrenQuery = childrenQuery.eq("group_id", group);
  const { data: children } = await childrenQuery;

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name, sort_order")
    .eq("teacher_id", user!.id)
    .order("sort_order");

  const childOptions = (children ?? []).map((c) => ({
    id: c.id,
    label: `${c.last_name ? c.last_name + " " : ""}${c.first_name} · ${
      (c as unknown as { groups: { name: string } }).groups?.name
    }`,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Гарааны үнэлгээ нэмэх</h1>
      <p className="mt-1 text-sm text-slate-500">
        Суралцахуйн чиглэлээр анхны түвшинг тогтоож, баримт нотолгоо болгож зураг хавсаргана уу.
      </p>
      <div className="mt-6">
        <ObservationForm
          action={createObservation}
          childOptions={childOptions}
          domainOptions={domains ?? []}
          defaultChildId={child}
          stage="garaa"
          noteLabel="Ажиглалтын тэмдэглэл, шалгуур"
          submitLabel="Гарааны үнэлгээ хадгалах"
        />
      </div>
    </div>
  );
}
