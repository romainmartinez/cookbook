import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("ui_prompt_start", (event) => {
    pi.events.emit("herdr:blocked", {
      active: true,
      label: event.title ?? "Answer question",
    });
  });

  pi.on("ui_prompt_end", () => {
    pi.events.emit("herdr:blocked", { active: false });
  });
}
