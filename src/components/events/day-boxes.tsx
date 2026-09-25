"use client";

/**
 * One box per day of the span; boxes for days already completed are filled.
 * Box size steps down as the span grows so a multi-year event still fits
 * without scrolling.
 */
export function DayBoxes({
  totalDays,
  elapsedDays,
}: {
  totalDays: number;
  elapsedDays: number;
}) {
  const size = totalDays > 400 ? 6 : totalDays > 180 ? 8 : totalDays > 60 ? 10 : 14;
  const gap = size <= 8 ? 2 : 3;

  return (
    <div
      role="img"
      aria-label={`${elapsedDays} of ${totalDays} days complete`}
      className="flex flex-wrap"
      style={{ gap }}
    >
      {Array.from({ length: totalDays }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`rounded-[2px] ${
            i < elapsedDays ? "bg-box-filled" : "bg-box-empty"
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}
