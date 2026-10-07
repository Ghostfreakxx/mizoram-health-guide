"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A consultation room is its own full-screen mode: the site header, footer and
// bottom navigation step aside so the doctor, the conversation and the
// current action are all that is on screen. (The room has its own top bar
// with Leave and Emergency.)
export const isImmersive = (pathname: string) => /^\/ai-hospital\/departments\/[^/]+\/room\/?$/.test(pathname);

export default function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  return isImmersive(pathname) ? null : <>{children}</>;
}
