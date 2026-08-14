"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна.");
      return;
    }
    if (password.length < 6) {
      setError("Нууц үг дор хаяж 6 тэмдэгт байх ёстой.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("Нууц үг шинэчлэхэд алдаа гарлаа: " + error.message);
      setLoading(false);
      return;
    }
    setNotice("Нууц үг амжилттай шинэчлэгдлээ. Нэвтрэх хуудас руу шилжиж байна...");
    setLoading(false);
    setTimeout(() => {
      router.push("/groups");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl shadow-indigo-100">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-teal-500 px-8 py-7 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur">
            🔑
          </div>
          <h1 className="mt-3 text-xl font-semibold">Шинэ нууц үг тохируулах</h1>
          <p className="mt-1 text-sm text-indigo-100">Багш нарын систем</p>
        </div>

        <div className="p-8 pt-6">
          {!ready ? (
            <p className="text-sm text-slate-500">
              Холбоосыг шалгаж байна... Хэрэв удаан хугацаанд ямар ч өөрчлөлт гарахгүй бол
              и-мэйлдээ ирсэн холбоос дээр дахин дарна уу.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Шинэ нууц үг</label>
                <div className="relative mt-1">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Нууц үг давтах</label>
                <div className="relative mt-1">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Дахин оруулна уу"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {notice && <p className="text-sm text-emerald-600">{notice}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Хадгалж байна..." : "Нууц үг хадгалах"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
