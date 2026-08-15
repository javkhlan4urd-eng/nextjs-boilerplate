import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONCLUSION_THRESHOLD } from "@/lib/outcomeConclusion";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");
  const outcomeId = searchParams.get("outcome_id");
  if (!childId || !outcomeId) {
    return NextResponse.json({ error: "child_id, outcome_id шаардлагатай" }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from("observations")
    .select("observed_on, note")
    .eq("child_id", childId)
    .eq("outcome_id", outcomeId)
    .not("note", "is", null)
    .order("observed_on", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notes = (rows ?? []).filter((r) => r.note && r.note.trim());

  const { data: conclusionRow } = await supabase
    .from("outcome_conclusions")
    .select("conclusion, observation_count")
    .eq("child_id", childId)
    .eq("outcome_id", outcomeId)
    .maybeSingle();

  return NextResponse.json({
    notes,
    count: notes.length,
    threshold: CONCLUSION_THRESHOLD,
    conclusion: conclusionRow?.conclusion ?? null,
  });
}
