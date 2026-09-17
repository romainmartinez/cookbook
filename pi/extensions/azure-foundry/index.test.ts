import assert from "node:assert/strict";
import test from "node:test";
import { createFoundryFetch } from "./index.ts";

function recordingFetch(urls: string[]): typeof fetch {
  return async (input) => {
    urls.push(input instanceof Request ? input.url : input.toString());
    return new Response(null, { status: 200 });
  };
}

test("removes the unsupported beta query from Foundry Messages requests", async () => {
  const urls: string[] = [];
  const fetchFoundry = createFoundryFetch(recordingFetch(urls));

  await fetchFoundry(
    "https://example.services.ai.azure.com/anthropic/v1/messages?beta=true",
  );

  assert.deepEqual(urls, [
    "https://example.services.ai.azure.com/anthropic/v1/messages",
  ]);
});

test("preserves other query parameters and endpoints", async () => {
  const urls: string[] = [];
  const fetchFoundry = createFoundryFetch(recordingFetch(urls));

  await fetchFoundry(
    new Request(
      "https://example.services.ai.azure.com/anthropic/v1/messages?beta=true&trace=1",
    ),
  );
  await fetchFoundry("https://api.anthropic.com/v1/messages?beta=true");

  assert.deepEqual(urls, [
    "https://example.services.ai.azure.com/anthropic/v1/messages?trace=1",
    "https://api.anthropic.com/v1/messages?beta=true",
  ]);
});
