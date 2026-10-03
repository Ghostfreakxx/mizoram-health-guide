// Quality manager: picks how to present the virtual doctor on this device.
// The consultation itself is identical at every level; only the picture changes.
//
//  high     — full model, skin detail, soft shadows, full room (desktops)
//  medium   — lighter model, no shadows, full room (most phones and laptops)
//  low      — lightest model, minimal room, lower resolution (older phones)
//  fallback — 2D doctor (no WebGL, Data Saver, 2G, very low memory)

export type Tier = "high" | "medium" | "low" | "fallback";

export type DeviceInfo = {
  webgl: boolean;
  saveData?: boolean;
  effectiveType?: string; // "slow-2g" | "2g" | "3g" | "4g"
  deviceMemory?: number; // GB
  cores?: number;
  mobile?: boolean;
};

export function chooseTier(d: DeviceInfo): Tier {
  if (!d.webgl) return "fallback";
  if (d.saveData || d.effectiveType === "slow-2g" || d.effectiveType === "2g") return "fallback";
  if ((d.deviceMemory !== undefined && d.deviceMemory < 2) || (d.cores !== undefined && d.cores <= 2)) return "fallback";
  if (d.effectiveType === "3g" || (d.deviceMemory !== undefined && d.deviceMemory <= 2) || (d.cores !== undefined && d.cores <= 4 && d.mobile)) return "low";
  if (d.mobile || (d.deviceMemory !== undefined && d.deviceMemory <= 4) || (d.cores !== undefined && d.cores <= 4)) return "medium";
  return "high";
}

// One step down, used when the frame rate is too low.
export const stepDown = (t: Tier): Tier => (t === "high" ? "medium" : t === "medium" ? "low" : "fallback");

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function readDevice(): DeviceInfo {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
    userAgentData?: { mobile?: boolean };
  };
  return {
    webgl: hasWebGL(),
    saveData: nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    mobile: nav.userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(nav.userAgent),
  };
}
