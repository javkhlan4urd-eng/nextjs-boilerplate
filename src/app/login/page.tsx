"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });
      if (error) {
        setError("Илгээхэд алдаа гарлаа: " + error.message);
        setLoading(false);
        return;
      }
      setNotice(
        "Нууц үг сэргээх холбоосыг таны и-мэйл рүү илгээлээ. И-мэйлээ шалгаад холбоос дээр дарна уу."
      );
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Нэвтрэхэд алдаа гарлаа: и-мэйл эсвэл нууц үг буруу байна.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError("Бүртгүүлэхэд алдаа гарлаа: " + error.message);
        setLoading(false);
        return;
      }
      setNotice(
        "Бүртгэл амжилттай үүслээ. Хэрэв и-мэйл баталгаажуулалт шаардлагатай бол и-мэйлээ шалгана уу, эсвэл шууд нэвтэрч орно уу."
      );
      setMode("signin");
      setLoading(false);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl shadow-indigo-100">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-teal-500 px-8 py-7 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur">
            🌱
          </div>
          <h1 className="mt-3 text-xl font-semibold">Хөгжлийн ажиглалт-үнэлгээ</h1>
          <p className="mt-1 text-sm text-indigo-100">Багш нарын систем</p>
        </div>

        <div className="p-8 pt-6">
          {mode !== "forgot" && (
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 rounded-md py-1.5 transition ${
                  mode === "signin" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Нэвтрэх
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 rounded-md py-1.5 transition ${
                  mode === "signup" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Бүртгүүлэх
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="mb-2">
              <h2 className="text-base font-semibold text-slate-900">Нууц үг сэргээх</h2>
              <p className="mt-1 text-sm text-slate-500">
                Бүртгэлтэй и-мэйлээ оруулбал сэргээх холбоос илгээнэ.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Багшийн нэр</label>
                <input
                  required
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Бат-Эрдэнэ"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700">И-мэйл</label>
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="bagsh@example.com"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Нууц үг</label>
                <div className="relative mt-1">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Дор хаяж 6 тэмдэгт"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "signin" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setNotice(null);
                }}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Нууц үг мартсан?
              </button>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-emerald-600">{notice}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-95 disabled:opacity-60"
            >
              {loading
                ? "Уншиж байна..."
                : mode === "signin"
                  ? "Нэвтрэх"
                  : mode === "signup"
                    ? "Бүртгүүлэх"
                    : "Сэргээх холбоос илгээх"}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
                className="w-full text-sm font-medium text-slate-500 hover:underline"
              >
                ← Нэвтрэх хуудас руу буцах
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
