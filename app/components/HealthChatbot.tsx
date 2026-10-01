"use client";

import { useEffect, useRef, useState } from "react";
import { OPEN_CHAT_EVENT } from "./openChat";

const quickQuestions = [
  "What are early signs of oral cancer?",
  "How does smoking affect my health?",
  "What are warning signs of diabetes?",
  "When should I visit a hospital?",
];

type Message = { role: "user" | "bot"; text: string };

export default function HealthChatbot() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hello. I am the AI Health Guide. I give simple health awareness information. I do not diagnose or prescribe medicine.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    let reply: string;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      reply = data.reply;
    } catch {
      reply = "Sorry, the AI assistant is not working right now.";
    }

    setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    setLoading(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="AI Health Guide"
          className="mb-3 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between bg-teal-700 px-4 py-3 text-white">
            <div>
              <h2 className="font-bold">AI Health Guide</h2>
              <p className="text-xs text-teal-100">Simple health awareness assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full px-2 py-1 text-lg hover:bg-teal-800"
            >
              ✕
            </button>
          </div>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="h-80 overflow-y-auto bg-slate-50 p-4 space-y-3 text-sm"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`whitespace-pre-line rounded-xl px-3 py-2 leading-relaxed ${
                  msg.role === "user"
                    ? "ml-10 bg-teal-700 text-white"
                    : "mr-10 border border-slate-200 bg-white text-slate-800"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className="mr-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500">
                Thinking…
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-medium text-slate-500">Try asking:</p>
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="block w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-left text-teal-800 hover:bg-teal-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="border-t border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                aria-label="Your health question"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                placeholder="Ask a health question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              For awareness only. Not medical advice. In an emergency call 108.
            </p>
          </form>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-teal-700 px-5 py-3 font-semibold text-white shadow-lg hover:bg-teal-800"
        >
          💬 Ask AI
        </button>
      )}
    </div>
  );
}
