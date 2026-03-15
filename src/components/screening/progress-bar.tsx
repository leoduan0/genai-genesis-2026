"use client";

interface ProgressBarProps {
  current: number;
  estimated: number;
}

export function ProgressBar({ current, estimated }: ProgressBarProps) {
  const pct = Math.min((current / Math.max(estimated, 1)) * 100, 100);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">
        Question {current} of ~{estimated}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
