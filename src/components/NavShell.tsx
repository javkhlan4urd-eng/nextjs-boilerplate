"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "Нүүр" },
  { href: "/children", label: "Бүлгүүд" },
  { href: "/assessment/yavts", label: "Явцын үнэлгээ" },
  { href: "/assessment", label: "Үнэлгээ" },
  { href: "/fitness", label: "Биеийн тамирын сорил" },
  { href: "/analysis", label: "Анализ дүгнэлт" },
  { href: "/reports", label: "Тайлан тохиргоо" },
];

export default function NavShell({
  teacherName,
  children,
}: {
  teacherName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <button
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Цэс"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-teal-500 text-base shadow-sm">
            🌱
          </div>
          <span className="font-semibold text-slate-900">
            Хөгжлийн ажиглалт-үнэлгээ
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {teacherName?.[0]?.toUpperCase() ?? "Б"}
            </span>
            {teacherName}
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          className={`no-print ${
            open ? "block" : "hidden"
          } absolute z-10 w-full border-b border-slate-200 bg-white px-4 py-2 sm:static sm:block sm:w-56 sm:border-b-0 sm:border-r sm:border-slate-200/70 sm:bg-white/60 sm:px-3 sm:py-6`}
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`relative block rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-gradient-to-r from-indigo-50 to-teal-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-gradient-to-b from-indigo-600 to-teal-500" />
                    )}
                    <span className="pl-2">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
