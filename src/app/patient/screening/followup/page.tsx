"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface FollowupMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ScreeningFollowupPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FollowupMessage[]>([]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const sid = sessionStorage.getItem("screeningSessionId");
    if (!sid) {
      router.push("/patient/screening");
      return;
    }
    setSessionId(sid);
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, processing]);

  const handleSend = useCallback(async () => {
    if (!sessionId || !input.trim() || processing) return;

    const question = input.trim();
    setInput("");
    setProcessing(true);

    const userMsg: FollowupMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/screening/${sessionId}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          conversationHistory: messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get answer");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I wasn't able to process that question. Please try again.",
        },
      ]);
    } finally {
      setProcessing(false);
    }
  }, [sessionId, input, processing, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-(image:--page-bg)">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit">
              Follow-up
            </Badge>
            <h1 className="text-lg font-semibold tracking-tight font-display">
              Questions about your results
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/patient/screening/report")}
          >
            Back to report
          </Button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Ask anything about your screening results. Remember, this is a
          screening tool — for a full evaluation, please speak with a provider.
        </p>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto pb-4"
        >
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {processing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your results..."
            className="min-h-[44px] max-h-[120px] resize-none rounded-xl"
            rows={1}
            disabled={processing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || processing}
            className="shrink-0 rounded-xl"
          >
            Send
          </Button>
        </div>
      </div>
    </main>
  );
}
