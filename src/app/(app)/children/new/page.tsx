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
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-teal-500 p-6 text-white shadow-lg shadow-indigo-200/60">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-100">
          🧒 Хүүхэд нэмэх
        </p>
        <h1 className="mt-1 text-xl font-bold">Хүүхэд нэмэх</h1>
        <p className="mt-1.5 text-sm text-indigo-100">Хүүхдийн болон эцэг эхийн мэдээллийг бөглөнө үү.</p>
      </div>
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
