// Picks how to present the virtual guide on this device. The consultation
// itself is identical in every mode; only the picture changes.
//
//  full     — 3D guide and room, higher resolution
//  standard — 3D guide, simpler room, lower resolution
//  lite     — 2D guide (no WebGL, slow connection, or low-memory phone)

export type Tier = "full" | "standard" | "lite";

export type DeviceInfo = {
  webgl: boolean;
  saveData?: boolean;
  effectiveType?: string; // "slow-2g" | "2g" | "3g" | "4g"
  deviceMemory?: number; // GB
  cores?: number;
  mobile?: boolean;
};

export function chooseTier(d: DeviceInfo): Tier {
  if (!d.webgl) return "lite";
  if (d.saveData || d.effectiveType === "slow-2g" || d.effectiveType === "2g") return "lite";
  if ((d.deviceMemory !== undefined && d.deviceMemory < 2) || (d.cores !== undefined && d.cores <= 2)) return "lite";
  if (d.mobile || (d.deviceMemory !== undefined && d.deviceMemory <= 4) || (d.cores !== undefined && d.cores <= 4)) return "standard";
  return "full";
}

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
