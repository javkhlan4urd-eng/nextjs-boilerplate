import { createClient } from "@/lib/supabase/server";
import { createChild } from "../actions";
import ChildForm from "@/components/ChildForm";

export default async function NewChildPage({
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
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Хүүхэд нэмэх</h1>
      <p className="mt-1 text-sm text-slate-500">Хүүхдийн болон эцэг эхийн мэдээллийг бөглөнө үү.</p>
      <div className="mt-6">
        <ChildForm
          action={createChild}
          groupId={group}
          groups={groups ?? []}
          submitLabel="Хүүхэд нэмэх"
        />
      </div>
    </div>
  );
}
