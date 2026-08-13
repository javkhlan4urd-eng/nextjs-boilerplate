import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavShell from "@/components/NavShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const teacherName = profile?.full_name || profile?.email || "Багш";

  return <NavShell teacherName={teacherName}>{children}</NavShell>;
}
