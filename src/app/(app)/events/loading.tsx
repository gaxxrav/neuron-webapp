import { SkeletonBoard, SkeletonCard } from "@/components/skeleton";

export default function EventsLoading() {
  return (
    <SkeletonBoard>
      <div className="h-[110px] rounded-xl border border-border bg-surface shadow-sm" />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
    </SkeletonBoard>
  );
}
