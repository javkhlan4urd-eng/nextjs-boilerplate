import { redirect } from "next/navigation";

export default async function NewObservationPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;
  redirect(child ? `/assessment/yavts/new?child=${child}` : "/assessment/yavts/new");
}
