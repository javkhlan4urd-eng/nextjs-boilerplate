import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABELS } from "@/types/database";
import { domainColor, LEVEL_STYLES } from "@/lib/colors";
import { formatChildName } from "@/lib/childName";

const WEEKDAYS = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];

function formatToday() {
  const d = new Date();
  const months = [
    "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
    "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
  ];
  return `${WEEKDAYS[d.getDay()]}, ${d.getFullYear()} оны ${months[d.getMonth()]}ы ${d.getDate()}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user!.id)
    .single();
  const teacherName = profile?.full_name || profile?.email || "Багш";

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [
    { count: groupCount },
    { count: childCount },
    { count: obsMonthCount },
    { count: fitnessCount },
    { data: recentObs },
  ] = await Promise.all([
    supabase.from("groups").select("id", { count: "exact", head: true }).eq("teacher_id", user!.id),
    supabase
      .from("children")
      .select("id, groups!inner(teacher_id)", { count: "exact", head: true })
      .eq("groups.teacher_id", user!.id),
    supabase
      .from("observations")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user!.id)
      .gte("observed_on", monthStartStr),
    supabase.from("fitness_tests").select("id", { count: "exact", head: true }).eq("teacher_id", user!.id),
    supabase
      .from("observations")
      .select("*, children!inner(id, first_name, last_name, groups!inner(teacher_id)), learning_domains(name)")
      .eq("children.groups.teacher_id", user!.id)
      .order("observed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { label: "Бүлэг", value: groupCount ?? 0, href: "/groups", from: "from-indigo-500", to: "to-violet-500", icon: "🏫" },
    { label: "Хүүхэд", value: childCount ?? 0, href: "/children", from: "from-teal-500", to: "to-emerald-500", icon: "🧒" },
    { label: "Энэ сарын ажиглалт", value: obsMonthCount ?? 0, href: "/assessment/yavts", from: "from-amber-400", to: "to-orange-500", icon: "📝" },
    { label: "Биеийн тамирын сорил", value: fitnessCount ?? 0, href: "/fitness", from: "from-rose-500", to: "to-pink-500", icon: "🏃" },
  ];

  const quickActions = [
    { label: "Ажиглалт нэмэх", href: "/assessment/yavts/new", icon: "📝" },
    { label: "Хүүхэд нэмэх", href: "/children/new", icon: "🧒" },
    { label: "Сорил нэмэх", href: "/fitness/new", icon: "🏃" },
    { label: "Анализ харах", href: "/analysis", icon: "📊" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-500 to-teal-500 p-8 text-white shadow-lg shadow-indigo-200">
        <p className="text-sm font-medium text-indigo-100">{formatToday()}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          Сайн байна уу, {teacherName}! 🌱
        </h1>
        <p className="mt-2 max-w-xl text-sm text-indigo-100">
          Өнөөдөр хүүхдүүдийнхээ хөгжлийг ажиглаж, тэмдэглэл хөтлөх цаг боллоо.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
            >
              <span>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-2xl bg-gradient-to-br ${s.from} ${s.to} p-4 text-white shadow-sm transition hover:opacity-90`}
          >
            <div className="text-2xl">{s.icon}</div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-medium text-white/90">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Сүүлийн ажиглалтууд</h2>
          <Link href="/assessment/yavts" className="text-sm font-medium text-indigo-600 hover:underline">
            Бүгдийг харах →
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {recentObs && recentObs.length > 0 ? (
            recentObs.map((o) => {
              const c = (
                o as unknown as { children: { id: string; first_name: string; last_name: string | null } }
              ).children;
              const domainName = (o as unknown as { learning_domains: { name: string } })
                .learning_domains?.name;
              const dc = domainColor(domainName ?? "");
              const lv = o.level ? LEVEL_STYLES[o.level] : null;
              return (
                <Link
                  key={o.id}
                  href={`/children/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {formatChildName(c.first_name, c.last_name)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${dc.bg} ${dc.text}`}>
                      {domainName}
                    </span>
                    <span className="text-xs text-slate-500">{o.observed_on}</span>
                  </div>
                  {o.level && lv && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lv.bg} ${lv.text}`}>
                      {LEVEL_LABELS[o.level]}
                    </span>
                  )}
                </Link>
              );
            })
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Ажиглалт бүртгэгдээгүй байна. "Ажиглалт нэмэх" товчоор эхлүүлээрэй.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
