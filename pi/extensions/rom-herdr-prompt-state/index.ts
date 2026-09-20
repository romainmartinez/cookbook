import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Herdr's Pi integration consumes `herdr:blocked` but does not emit it for Pi UI prompts.
// This marks interactions such as `ask_user_question` and confirmation dialogs as blocked.
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
