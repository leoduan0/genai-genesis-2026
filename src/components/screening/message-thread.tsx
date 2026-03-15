"use client";

import { ScreeningItem } from "./screening-item";
import type { ScreeningItemData } from "./screening-item";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompressedExchange {
  question: string;
  answer: string; // e.g. "2/3 (More than half the days)" or "Trouble falling asleep"
}

export interface AssistantMessageData {
  id: string;
  text: string; // LLM's conversational text
  items?: ScreeningItemData[]; // zero or more embedded screening items
  compressed?: CompressedExchange[]; // if answered, compressed Q/A pairs replace the interactive items
}

export interface PatientMessageData {
  id: string;
  text: string; // "A: <answer>"
}

export type ChatMessage =
  | { type: "assistant"; data: AssistantMessageData }
  | { type: "patient"; data: PatientMessageData };

// ─── Components ─────────────────────────────────────────────────────────────

interface MessageThreadProps {
  messages: ChatMessage[];
  onItemAnswer?: (itemId: string, score: number, label: string) => void;
  waitingForItems?: Set<string>; // item IDs that are still interactive
}

export function MessageThread({
  messages,
  onItemAnswer,
  waitingForItems,
}: MessageThreadProps) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => {
        if (msg.type === "assistant") {
          return (
            <AssistantMessage
              key={msg.data.id}
              data={msg.data}
              onItemAnswer={onItemAnswer}
              waitingForItems={waitingForItems}
            />
          );
        }
        return <PatientMessage key={msg.data.id} data={msg.data} />;
      })}
    </div>
  );
}

function AssistantMessage({
  data,
  onItemAnswer,
  waitingForItems,
}: {
  data: AssistantMessageData;
  onItemAnswer?: (itemId: string, score: number, label: string) => void;
  waitingForItems?: Set<string>;
}) {
  const isCompressed = data.compressed && data.compressed.length > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] flex flex-col gap-2">
        {isCompressed ? (
          // Compressed: show Q: lines only
          data.compressed!.map((exchange, i) => (
            <div
              key={i}
              className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-foreground"
            >
              <span className="font-medium text-muted-foreground">Q:</span>{" "}
              {exchange.question}
            </div>
          ))
        ) : (
          <>
            {/* LLM conversational text */}
            {data.text && (
              <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-foreground">
                {data.text}
              </div>
            )}

            {/* Embedded screening items */}
            {data.items?.map((item) => (
              <div key={item.itemId} className="ml-0">
                <ScreeningItem
                  item={item}
                  onAnswer={onItemAnswer ?? (() => {})}
                  disabled={!waitingForItems?.has(item.itemId)}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function PatientMessage({ data }: { data: PatientMessageData }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
        {data.text}
      </div>
    </div>
  );
}
