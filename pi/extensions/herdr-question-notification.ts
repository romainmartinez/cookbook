import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.events.on("rpiv:ask-user:blocked", (event) => {
    pi.events.emit("herdr:blocked", {
      active: event?.active === true,
      label: event?.active === true ? "Answer question" : undefined,
    });
  });
}
