import { redirect } from "next/navigation";

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).filter((entry): entry is [string, string] => entry[1] !== undefined)
  ).toString();
  redirect(qs ? `/assessment/yavts?${qs}` : "/assessment/yavts");
}
