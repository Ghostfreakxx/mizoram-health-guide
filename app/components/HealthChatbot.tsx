"use client";

import { useState } from "react";

const quickQuestions = [
  "What are early signs of oral cancer?",
  "How does smoking affect my health?",
  "What are warning signs of diabetes?",
  "How can I reduce cancer risk?",
  "What causes high blood pressure?",
  "How much exercise do adults need?",
  "What are symptoms of depression?",
  "When should I visit a hospital?",
];

export default function HealthChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello. I am the AI Health Guide. I give simple health awareness information. I do not diagnose or prescribe medicine.",
    },
  ]);
  const [input, setInput] = useState("");

  function getBotReply(question: string) {
    const q = question.toLowerCase();

    if (q.includes("cancer")) {
      return "Some early warning signs of cancer can include a wound that does not heal, unusual bleeding, a lump, long-lasting cough, weight loss without reason, or difficulty swallowing. These signs do not always mean cancer, but it is safer to visit a doctor early.";
    }

    if (q.includes("tobacco") || q.includes("oral") || q.includes("smoking")) {
      return "Tobacco, smoking, and betel nut can increase the risk of mouth cancer, lung disease, and heart problems. If you use them, try to reduce slowly and ask a doctor or counsellor for help.";
    }

    if (q.includes("diabetes") || q.includes("sugar")) {
      return "Common signs of diabetes can include frequent urination, too much thirst, tiredness, slow wound healing, blurred vision, and weight changes. A simple blood sugar test can help confirm it.";
    }

    if (q.includes("doctor") || q.includes("hospital")) {
      return "Visit a doctor if symptoms continue for more than a few days, become worse, cause severe pain, bleeding, breathing difficulty, chest pain, fainting, or sudden weakness.";
    }

    return "Thank you for asking. This assistant gives only general awareness. For serious symptoms, please visit a doctor or hospital.";
  }

  async function sendMessage(text?: string) {
  const userText = text || input;
  if (!userText.trim()) return;

  setInput("");

  setMessages((prev) => [
    ...prev,
    { role: "user", text: userText },
    { role: "bot", text: "Thinking..." },
  ]);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userText }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev.slice(0, -1),
      { role: "bot", text: data.reply },
    ]);
  } catch {
    setMessages((prev) => [
      ...prev.slice(0, -1),
      {
        role: "bot",
        text: "Sorry, the AI assistant is not working right now.",
      },
    ]);
  }
}

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-4 w-[360px] max-w-[90vw] rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <div>
              <h3 className="font-bold">AI Health Guide</h3>
              <p className="text-xs text-slate-400">
                Simple health awareness assistant
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-full bg-slate-800 px-3 py-1 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="h-72 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`rounded-xl p-3 leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-400 text-slate-950 ml-8"
                    : "bg-slate-800 text-slate-200 mr-8"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="px-4 pb-3 grid grid-cols-1 gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800 p-3">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none"
                placeholder="Ask a health question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />

              <button
                onClick={() => sendMessage()}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950"
              >
                Send
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              For awareness only. Not medical advice.
            </p>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-emerald-400 px-5 py-4 font-bold text-slate-950 shadow-xl"
        >
          🤖 Ask AI
        </button>
      )}
    </div>
  );
}

function setInput(question: string): void {
    throw new Error("Function not implemented.");
}
