import Link from "next/link";

const CARDS = [
  {
    href: "/assessment/garaa",
    icon: "🚩",
    title: "Гарааны үнэлгээ",
    desc: "Хичээлийн жилийн эхэнд суралцахуйн 7 чиглэл тус бүрээр анхны түвшинг тэмдэглэл, зураг баримттайгаар тогтооно.",
    from: "from-indigo-500",
    to: "to-violet-500",
  },
  {
    href: "/assessment/result",
    icon: "🏁",
    title: "Үр дүнгийн үнэлгээ",
    desc: "Явцын үнэлгээн дээр үндэслэн чиглэл тус бүрээр автоматаар тооцоологдох эцсийн дүн, тайлан.",
    from: "from-amber-400",
    to: "to-orange-500",
  },
  {
    href: "/reports/outcomes",
    icon: "📋",
    title: "СҮД дүгнэлтийн тайлан",
    desc: "Суралцахуйн үр дүн (СҮД) тус бүрээр AI-ийн гаргасан дүгнэлт, чиглэл бүрээр болон нэгдсэн диаграм.",
    from: "from-rose-500",
    to: "to-pink-500",
  },
  {
    href: "/reports",
    icon: "🖨️",
    title: "Тайлан & тохиргоо",
    desc: "Суралцахуйн чиглэлийн тохиргоо хийх, тухайн хугацааны хөгжлийн тайланг үүсгэж хэвлэх/PDF татах.",
    from: "from-teal-500",
    to: "to-cyan-400",
  },
];

export default function AssessmentHubPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-500 to-teal-500 p-6 text-white shadow-lg shadow-indigo-200/60 sm:p-7">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-100">
          🎯 Үнэлгээ
        </p>
        <h1 className="mt-1 text-2xl font-bold">Хүүхдийн хөгжлийн үнэлгээ</h1>
        <p className="mt-1.5 max-w-lg text-sm text-indigo-100">
          Гарааны, явцын, үр дүнгийн гэсэн 3 үе шаттай үнэлгээгээр хүүхдийн хөгжлийг тогтмол хянаж,
          тайлан гаргана.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-2xl bg-gradient-to-br ${c.from} ${c.to} p-5 text-white shadow-sm shadow-slate-200 transition hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md`}
          >
            <div className="text-3xl">{c.icon}</div>
            <div className="mt-3 text-lg font-semibold">{c.title}</div>
            <p className="mt-1 text-sm text-white/90">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
