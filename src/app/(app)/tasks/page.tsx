import { TasksBoard } from "@/components/tasks/tasks-board";
import { loadWorkspace } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { sections, items, visualisedItemIds } = await loadWorkspace();

  return (
    <TasksBoard
      sections={sections}
      items={items}
      visualisedItemIds={visualisedItemIds}
    />
  );
}
