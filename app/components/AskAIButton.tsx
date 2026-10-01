"use client";

import { openChat } from "./openChat";

export default function AskAIButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={openChat} className={className}>
      {children}
    </button>
  );
}
