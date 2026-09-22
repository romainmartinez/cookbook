import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import registerAzureFoundry, { createFoundryFetch } from "./index.ts";

function recordingFetch(urls: string[]): typeof fetch {
  return async (input) => {
    urls.push(input instanceof Request ? input.url : input.toString());
    return new Response(null, { status: 200 });
  };
}

test("configures Claude Opus 5.5 for its Foundry deployment", (t) => {
  const previousResourceName = process.env.AZURE_FOUNDRY_RESOURCE_NAME;
  process.env.AZURE_FOUNDRY_RESOURCE_NAME = "example";
  t.after(() => {
    if (previousResourceName === undefined) delete process.env.AZURE_FOUNDRY_RESOURCE_NAME;
    else process.env.AZURE_FOUNDRY_RESOURCE_NAME = previousResourceName;
  });

  let config: any;
  const pi = {
    registerProvider: (_name: string, providerConfig: unknown) => { config = providerConfig; },
  } as unknown as ExtensionAPI;
  registerAzureFoundry(pi);

  const model = config.models.find(({ id }: { id: string }) => id === "claude-opus-5-5");
  assert.ok(model);
  assert.equal(model.baseUrl, "https://example.services.ai.azure.com/anthropic");
  assert.equal(model.contextWindow, 1_000_000);
  assert.equal(model.maxTokens, 128_000);
  assert.deepEqual(model.cost, {
    input: 4,
    output: 20,
    cacheRead: 0.2,
    cacheWrite: 5,
  });
  assert.deepEqual(model.promptCache, { short: 300, long: 3_600 });
  assert.equal(model.compat.supportsMidConvoEffort, true);
});

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
