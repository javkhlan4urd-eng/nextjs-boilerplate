import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABELS } from "@/lib/fitnessCriteria";
import DeleteFitnessButton from "@/components/DeleteFitnessButton";

const LEVEL_STYLE: Record<string, { bg: string; text: string }> = {
  [LEVEL_LABELS.high]: { bg: "bg-emerald-100", text: "text-emerald-700" },
  [LEVEL_LABELS.ok]: { bg: "bg-amber-100", text: "text-amber-700" },
  [LEVEL_LABELS.support]: { bg: "bg-red-100", text: "text-red-700" },
};

export default async function FitnessPage({
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

  let query = supabase
    .from("fitness_tests")
    .select(
      "*, children!inner(id, first_name, last_name, group_id, groups!inner(teacher_id, name))"
    )
    .eq("children.groups.teacher_id", user!.id)
    .order("tested_on", { ascending: false })
    .limit(100);

  if (group) query = query.eq("children.group_id", group);

  const { data: tests } = await query;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Биеийн тамирын сорил</h1>
          <p className="mt-1 text-sm text-slate-500">
            Хурд, Хүч, Авхаалж самбаа, Тэнцвэрийн сорилын үр дүн.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={group ? `/fitness/report?group=${group}` : "/fitness/report"}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            📊 Тайлан, анализ
          </Link>
          <Link
            href={group ? `/fitness/new?group=${group}` : "/fitness/new"}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:opacity-95"
          >
            + Сорил нэмэх
          </Link>
        </div>
      </div>

      {groups && groups.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/fitness"
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
              href={`/fitness?group=${g.id}`}
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

      <div className="mt-4 space-y-3">
        {tests && tests.length > 0 ? (
          tests.map((t) => {
            const c = (
              t as unknown as {
                children: { id: string; first_name: string; last_name: string | null; groups: { name: string } };
              }
            ).children;
            const style = LEVEL_STYLE[t.level ?? ""] ?? { bg: "bg-slate-100", text: "text-slate-600" };
            return (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/children/${c.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-700"
                    >
                      {c.last_name ? `${c.last_name} ` : ""}
                      {c.first_name}
                    </Link>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {c.groups?.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t.tested_on} · {t.age_group} нас · {t.gender}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                      {t.total_score}/12 · {t.level}
                    </span>
                    <DeleteFitnessButton id={t.id} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Хурд: {t.speed_sec} сек ({t.speed_score})</span>
                  <span>Хүч: {t.strength_value} ({t.strength_score})</span>
                  <span>Авхаалж самбаа: {t.agility_value} ({t.agility_score})</span>
                  <span>Тэнцвэр: {t.balance_sec} сек ({t.balance_score})</span>
                </div>
                {t.note && <p className="mt-2 text-sm text-slate-700">{t.note}</p>}
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Сорилын үр дүн олдсонгүй.
          </p>
        )}
      </div>
    </div>
  );
}
