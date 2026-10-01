export const OPEN_CHAT_EVENT = "open-health-chat";

export function openChat() {
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT));
}
