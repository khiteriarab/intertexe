"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { HqCard } from "../../components/HqUi";

type Msg = { role: "user" | "assistant"; content: string };

export function AiChatClient({
  briefingLines,
  actions,
}: {
  briefingLines: string[];
  actions: Array<{ title: string; recommendedAction: string }>;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || streaming) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/dashboard/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Chat failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const json = JSON.parse(line.slice(5).trim());
          if (json.conversationId) setConversationId(json.conversationId);
          if (json.error) throw new Error(json.error);
          if (json.content) {
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: last.content + json.content };
              }
              return copy;
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Chat failed");
      setMessages((m) => m.filter((msg, idx) => !(idx === m.length - 1 && msg.role === "assistant" && !msg.content)));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
      <HqCard className="min-h-[480px] flex flex-col">
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-4">Conversation</p>
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[420px] pr-1">
          {messages.length === 0 ? (
            <p className="text-sm text-black/50 leading-relaxed">
              Ask about scans, materials, DPP coverage, campaigns, or commerce. Answers use live metrics and rule
              insights — never invented numbers.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "text-black" : "text-black/75"
                }`}
              >
                <span className="text-[10px] tracking-[0.14em] uppercase text-black/35 block mb-1">
                  {m.role === "user" ? "You" : "Executive AI"}
                </span>
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        {error ? <p className="text-sm text-red-700 mt-3">{error}</p> : null}
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What should we prioritize this week?"
            className="flex-1 border border-black/15 rounded-lg px-3 py-2.5 text-sm"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="bg-black text-white text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg disabled:opacity-60"
          >
            {streaming ? "…" : "Ask"}
          </button>
        </form>
      </HqCard>

      <div className="space-y-4">
        <HqCard>
          <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-3">Morning briefing</p>
          <div className="space-y-2 text-sm text-black/75 leading-relaxed">
            {briefingLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </HqCard>
        <HqCard title="Recommended actions">
          <ul className="list-disc pl-5 space-y-2 text-sm text-black/70">
            {actions.map((a) => (
              <li key={a.title}>
                <span className="font-medium text-black/85">{a.title}.</span> {a.recommendedAction}
              </li>
            ))}
          </ul>
        </HqCard>
      </div>
    </div>
  );
}
