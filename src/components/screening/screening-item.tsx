"use client";

export interface ScreeningItemData {
  itemId: string;
  text: string;
  responseMin: number;
  responseMax: number;
  responseLabels: Record<string, string>;
}

interface ScreeningItemProps {
  item: ScreeningItemData;
  onAnswer: (itemId: string, score: number, label: string) => void;
  disabled?: boolean;
}

/**
 * Renders an interactive screening item.
 *
 * - If responseLabels has entries for every integer in [min, max] → Likert scale
 *   (labels on top row, numbered bubbles below)
 * - Otherwise → MCQ with text bubbles
 */
export function ScreeningItem({ item, onAnswer, disabled }: ScreeningItemProps) {
  const range = item.responseMax - item.responseMin + 1;
  const labelEntries = Object.entries(item.responseLabels).sort(
    ([a], [b]) => Number(a) - Number(b),
  );

  // Check if it's a Likert scale: labels for all integers in range
  const isLikert =
    labelEntries.length === range &&
    labelEntries.every(([k]) => {
      const n = Number(k);
      return Number.isInteger(n) && n >= item.responseMin && n <= item.responseMax;
    });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
      <p className="text-sm font-medium text-foreground">{item.text}</p>

      {isLikert ? (
        <LikertScale
          labels={labelEntries}
          max={item.responseMax}
          onSelect={(score) => {
            const label = item.responseLabels[String(score)] ?? String(score);
            onAnswer(item.itemId, score, label);
          }}
          disabled={disabled}
        />
      ) : (
        <McqChoices
          choices={labelEntries}
          onSelect={(score, label) => onAnswer(item.itemId, score, label)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function LikertScale({
  labels,
  max,
  onSelect,
  disabled,
}: {
  labels: [string, string][];
  max: number;
  onSelect: (score: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Label row */}
      <div className="flex justify-between gap-1">
        {labels.map(([, label]) => (
          <span
            key={label}
            className="flex-1 text-center text-xs text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      {/* Bubble row */}
      <div className="flex justify-between gap-1">
        {labels.map(([key]) => {
          const score = Number(key);
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(score)}
              className="flex h-10 w-10 flex-1 items-center justify-center rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function McqChoices({
  choices,
  onSelect,
  disabled,
}: {
  choices: [string, string][];
  onSelect: (score: number, label: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {choices.map(([key, label]) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(Number(key), label)}
          className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
