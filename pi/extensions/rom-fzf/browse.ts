import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { collectMessages, messageItem, rowOf } from "./messages.ts";
import { color, type Item, pick } from "./picker.ts";
import { hitItem, listHits, listSessions, sessionItem } from "./sessions.ts";

type View = { name: string; items: () => Promise<Item[]>; open: (index: number) => Promise<string | void> };

const cached = <T>(load: () => Promise<T>) => {
  let value: Promise<T> | undefined;
  return () => (value ??= load());
};

async function cycle(tui: any, views: View[]) {
  tui.stop();
  try {
    for (let i = 0; ; i = (i + 1) % views.length) {
      const view = views[i];
      const tabs = views.map(({ name }, j) => color(j === i ? "1" : "2", name)).join(color("2", " · "));
      const picked = await pick(tabs, await view.items(), tui.terminal.columns);
      if (picked === undefined) return;
      if (picked !== "next") return { view, index: picked };
    }
  } finally {
    tui.start();
    tui.requestRender(true);
  }
}

export async function browse(tui: any, ctx: ExtensionContext): Promise<string | void> {
  const { sessionManager } = ctx;
  const sessions = cached(() => listSessions(sessionManager.getSessionDir(), sessionManager.getSessionFile()));
  const hits = cached(async () => listHits(await sessions()));
  const scrollView = tui.mode === "fullscreen" ? tui.getPrimaryScrollView() : undefined;
  const messages = scrollView ? collectMessages(scrollView.child) : [];

  const inSession: View = {
    name: "Messages",
    items: async () => messages.map(messageItem),
    open: async (index) => {
      const row = rowOf(scrollView.child, messages[index].component, scrollView.getContentWidth(tui.terminal.columns));
      if (row >= 0) scrollView.scrollTo(row);
    },
  };
  const views: View[] = [
    ...(messages.length ? [inSession] : []),
    {
      name: "Sessions",
      items: async () => (await sessions()).map(sessionItem),
      open: async (index) => (await sessions())[index].path,
    },
    {
      name: "Project transcripts",
      items: async () => (await hits()).map(hitItem),
      open: async (index) => (await hits())[index].path,
    },
  ];

  const choice = await cycle(tui, views);
  return choice?.view.open(choice.index);
}
