import { EventBoard } from "@/components/events/event-board";
import { loadEvents } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await loadEvents();

  return <EventBoard events={events} />;
}
