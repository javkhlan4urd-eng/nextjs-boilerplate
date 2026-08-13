"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Дор хаяж 6 тэмдэгт"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Нууц үг давтах</label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Дахин оруулна уу"
                />
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
