"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { preloadConsultation } from "./preload";

// A link to a consultation room that warms up the 3D doctor when the person
// points at or focuses it.
export default function RoomLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} onPointerEnter={preloadConsultation} onFocus={preloadConsultation} onTouchStart={preloadConsultation} />;
}
