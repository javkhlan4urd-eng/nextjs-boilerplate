import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReadinessChecklist from "@/components/ReadinessChecklist";

export default async function ChildReadinessPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: child } = await supabase
    .from("children")
    .select("id, first_name, last_name, groups!inner(teacher_id, name, level)")
    .eq("id", childId)
    .eq("groups.teacher_id", user!.id)
    .single();

  if (!child) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-500">Хүүхэд олдсонгүй.</p>
      </div>
    );
  }

  const group = (child as unknown as { groups: { name: string; level: number | null } }).groups;
  const level = group?.level ?? null;

  const { data: criteria } = level
    ? await supabase
        .from("readiness_criteria")
        .select("id, category, number, description")
        .eq("teacher_id", user!.id)
        .eq("level", level)
    : { data: [] as never[] };

  const { data: checksRaw } = await supabase
    .from("readiness_checks")
    .select("criterion_id, achieved")
    .eq("child_id", childId);

  const initialAchieved: Record<string, boolean> = {};
  for (const c of checksRaw ?? []) {
    initialAchieved[c.criterion_id] = c.achieved;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/assessment/result" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Буцах
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">
        {child.last_name ? `${child.last_name} ` : ""}
        {child.first_name} — Үр дүнгийн үнэлгээ
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {group?.name}
        {level ? ` · ${level}-р түвшин` : ""} — шалгуур бүрийг ажиглаад эзэмшсэн эсэхийг тэмдэглэнэ үү.
      </p>

      {!level ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Энэ хүүхдийн бүлэгт насны түвшин (1-4) тохируулаагүй байна. Эхлээд Бүлэг цэснээс тохируулна уу.
        </p>
      ) : (
        <div className="mt-6">
          <ReadinessChecklist childId={child.id} criteria={criteria ?? []} initialAchieved={initialAchieved} />
        </div>
      )}
    </div>
  );
}
