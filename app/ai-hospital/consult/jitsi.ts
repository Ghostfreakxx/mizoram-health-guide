// Loads the Jitsi Meet IFrame API from the Health Department's own video
// server (self-hosted). AI Hospital itself never receives the video.

export type JitsiApi = {
  addListener: (event: string, fn: (...args: unknown[]) => void) => void;
  executeCommand: (cmd: string, ...args: unknown[]) => void;
  getNumberOfParticipants: () => number;
  dispose: () => void;
};

type JitsiCtor = new (
  domain: string,
  options: {
    roomName: string;
    parentNode: HTMLElement;
    width?: string;
    height?: string;
    userInfo?: { displayName?: string };
    configOverwrite?: Record<string, unknown>;
    interfaceConfigOverwrite?: Record<string, unknown>;
  },
) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiCtor;
  }
}

const loading = new Map<string, Promise<JitsiCtor>>();

export function loadJitsi(domain: string): Promise<JitsiCtor> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  const existing = loading.get(domain);
  if (existing) return existing;
  const p = new Promise<JitsiCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://${domain}/external_api.js`;
    s.async = true;
    s.onload = () => (window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error("Video unavailable")));
    s.onerror = () => reject(new Error("Video unavailable"));
    document.head.appendChild(s);
  });
  loading.set(domain, p);
  return p;
}

export function startCall(Api: JitsiCtor, domain: string, room: string, parent: HTMLElement, displayName: string): JitsiApi {
  return new Api(domain, {
    roomName: room,
    parentNode: parent,
    width: "100%",
    height: "100%",
    userInfo: { displayName },
    configOverwrite: {
      prejoinPageEnabled: false,
      disableDeepLinking: true,
      // Never record or stream consultations from the patient side.
      fileRecordingsEnabled: false,
      liveStreamingEnabled: false,
      enableClosePage: false,
      p2p: { enabled: true },
    },
    interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false },
  });
}
