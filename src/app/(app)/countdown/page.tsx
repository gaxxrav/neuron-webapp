import { CountdownBoard } from "@/components/countdown/countdown-board";
import { loadCountdowns } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CountdownPage() {
  const countdowns = await loadCountdowns();

  return <CountdownBoard countdowns={countdowns} />;
}
