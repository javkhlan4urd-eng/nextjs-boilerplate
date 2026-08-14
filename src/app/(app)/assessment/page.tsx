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
    href: "/assessment/yavts",
    icon: "🔄",
    title: "Явцын үнэлгээ",
    desc: "Хичээлийн жилийн туршид тогтмол хийгдэх, чиглэл тус бүрийн ажиглалт тэмдэглэл, зураг баримттай үнэлгээ.",
    from: "from-teal-500",
    to: "to-emerald-500",
  },
  {
    href: "/assessment/result",
    icon: "🏁",
    title: "Үр дүнгийн үнэлгээ",
    desc: "Явцын үнэлгээн дээр үндэслэн чиглэл тус бүрээр автоматаар тооцоологдох эцсийн дүн, тайлан.",
    from: "from-amber-400",
    to: "to-orange-500",
  },
];

export default function AssessmentHubPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900">Үнэлгээ</h1>
      <p className="mt-1 text-sm text-slate-500">
        Гарааны, явцын, үр дүнгийн гэсэн 3 үе шаттай үнэлгээгээр хүүхдийн хөгжлийг тогтмол хянана.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-2xl bg-gradient-to-br ${c.from} ${c.to} p-5 text-white shadow-sm transition hover:opacity-90`}
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
