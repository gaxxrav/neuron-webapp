import { SkeletonBoard, SkeletonCard } from "@/components/skeleton";

export default function TasksLoading() {
  return (
    <SkeletonBoard>
      <div className="h-[86px] rounded-xl border border-border bg-surface shadow-sm" />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={3} />
    </SkeletonBoard>
  );
}
