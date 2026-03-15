"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/screening/progress-bar";
import { MessageThread } from "@/components/screening/message-thread";
import type {
  ChatMessage,
  AssistantMessageData,
} from "@/components/screening/message-thread";
import { ScreeningItem } from "@/components/screening/screening-item";
import type { ScreeningItemData } from "@/components/screening/screening-item";
import { Spinner } from "@/components/ui/spinner";

interface SelectedItemData {
  itemId: string;
  text: string;
  responseMin: number;
  responseMax: number;
  responseLabels: Record<string, string>;
}

interface RespondResult {
  score: number | null;
  nextQuestion: string | null;
  selectedItemId: string | null;
  selectedItem: SelectedItemData | null;
  terminated: boolean;
  terminationReason: string | null;
  stage: string;
  itemsAdministered: number;
  estimatedTotal: number;
  usedFallback: boolean;
}

export default function ScreeningChatPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [waitingForItems, setWaitingForItems] = useState<Set<string>>(new Set());
  const [itemsCompleted, setItemsCompleted] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(25);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    { role: string; content: string }[]
  >([]);

  // Initialize from sessionStorage
  useEffect(() => {
    const sid = sessionStorage.getItem("screeningSessionId");
    const firstItemRaw = sessionStorage.getItem("screeningFirstItem");

    if (!sid) {
      router.push("/patient/screening");
      return;
    }

    setSessionId(sid);

    if (firstItemRaw) {
      const firstItem: SelectedItemData = JSON.parse(firstItemRaw);
      const screeningItem: ScreeningItemData = {
        itemId: firstItem.itemId,
        text: firstItem.text,
        responseMin: firstItem.responseMin,
        responseMax: firstItem.responseMax,
        responseLabels: firstItem.responseLabels,
      };

      const assistantMsg: AssistantMessageData = {
        id: `asst-0`,
        text: "",
        items: [screeningItem],
      };

      setMessages([{ type: "assistant", data: assistantMsg }]);
      setPendingItemId(firstItem.itemId);
      setWaitingForItems(new Set([firstItem.itemId]));
      setConversationHistory([
        { role: "assistant", content: firstItem.text },
      ]);

      sessionStorage.removeItem("screeningFirstItem");
    }
  }, [router]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, processing]);

  const handleItemAnswer = useCallback(
    async (itemId: string, score: number, label: string) => {
      if (!sessionId || processing) return;

      // Find the assistant message containing this item and get the item data
      let itemData: ScreeningItemData | undefined;
      for (const msg of messages) {
        if (msg.type === "assistant" && msg.data.items) {
          itemData = msg.data.items.find((i) => i.itemId === itemId);
          if (itemData) break;
        }
      }

      // Build the answer text
      const maxResponse = itemData?.responseMax ?? score;
      const answerText = itemData?.responseLabels?.[String(score)]
        ? `A: ${score}/${maxResponse} (${label})`
        : `A: ${label}`;

      // Compress the assistant message and add patient answer
      setMessages((prev) => {
        const updated = [...prev];

        // Find and compress the assistant message with this item
        for (let i = updated.length - 1; i >= 0; i--) {
          const msg = updated[i];
          if (msg.type === "assistant" && msg.data.items) {
            const item = msg.data.items.find((it) => it.itemId === itemId);
            if (item) {
              const compressed = msg.data.compressed ?? [];
              compressed.push({ question: item.text, answer: answerText });

              // Remove this item from active items
              const remainingItems = msg.data.items.filter(
                (it) => it.itemId !== itemId,
              );

              updated[i] = {
                type: "assistant",
                data: {
                  ...msg.data,
                  text: remainingItems.length > 0 ? msg.data.text : "",
                  items: remainingItems.length > 0 ? remainingItems : undefined,
                  compressed,
                },
              };
              break;
            }
          }
        }

        // Add patient answer bubble
        updated.push({
          type: "patient",
          data: { id: `patient-${Date.now()}`, text: answerText },
        });

        return updated;
      });

      // Remove from waiting set
      setWaitingForItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      // Send to backend
      setProcessing(true);

      const history = [
        ...conversationHistory,
        { role: "user", content: `${score}` },
      ];

      try {
        const res = await fetch(`/api/screening/${sessionId}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score,
            pendingItemId: itemId,
            conversationHistory: history,
          }),
        });
        const data: RespondResult = await res.json();
        if (!res.ok) throw new Error((data as unknown as { error: string }).error);

        setItemsCompleted(data.itemsAdministered);
        setEstimatedTotal(data.estimatedTotal);

        // Update conversation history
        const updatedHistory = [...history];
        if (data.nextQuestion) {
          updatedHistory.push({
            role: "assistant",
            content: data.nextQuestion,
          });
        }
        setConversationHistory(updatedHistory);

        if (data.terminated) {
          router.push("/patient/screening/report");
          return;
        }

        if (data.selectedItem) {
          const nextItem: ScreeningItemData = {
            itemId: data.selectedItem.itemId,
            text: data.selectedItem.text,
            responseMin: data.selectedItem.responseMin,
            responseMax: data.selectedItem.responseMax,
            responseLabels: data.selectedItem.responseLabels,
          };

          const assistantMsg: AssistantMessageData = {
            id: `asst-${Date.now()}`,
            text: "",
            items: [nextItem],
          };

          setMessages((prev) => [
            ...prev,
            { type: "assistant", data: assistantMsg },
          ]);
          setPendingItemId(data.selectedItem.itemId);
          setWaitingForItems(new Set([data.selectedItem.itemId]));
        }
      } catch (err) {
        console.error("Failed to process response:", err);
      } finally {
        setProcessing(false);
      }
    },
    [sessionId, processing, messages, conversationHistory, router],
  );

  // Extract the active screening item from the latest assistant message
  const activeItem = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.type === "assistant" && msg.data.items && msg.data.items.length > 0) {
        return msg.data.items[0];
      }
    }
    return null;
  })();

  return (
    <main className="relative h-screen overflow-hidden bg-(image:--page-bg)">
      <div className="mx-auto flex h-full max-w-2xl flex-col px-4 pt-6">
        {/* Progress */}
        <div className="mb-4 shrink-0">
          <ProgressBar current={itemsCompleted} estimated={estimatedTotal} />
        </div>

        {/* Message area */}
        <div
          ref={scrollRef}
          className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-4"
        >
          <MessageThread
            messages={messages}
            onItemAnswer={handleItemAnswer}
            waitingForItems={waitingForItems}
            hideActiveItems
          />

          {processing && (
            <div className="mt-3 flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                <Spinner />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Spacer — always present so chat area doesn't shift */}
        <div className="shrink-0 h-44" />
      </div>

      {/* Active screening item — absolutely positioned within the h-screen main */}
      <div className="absolute inset-x-0 bottom-6 z-10 mx-auto w-full max-w-2xl px-4">
        {activeItem && !processing && (
          <ScreeningItem
            item={activeItem}
            onAnswer={handleItemAnswer}
            disabled={!waitingForItems.has(activeItem.itemId)}
          />
        )}
      </div>
    </main>
  );
}

