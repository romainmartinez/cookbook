import {
  type Api,
  type Context,
  type FetchFunction,
  type Model,
  type SimpleStreamOptions,
} from "@earendil-works/pi-ai";
import { streamSimple as streamAnthropic } from "@earendil-works/pi-ai/api/anthropic-messages";
import { streamSimple as streamAzureOpenAI } from "@earendil-works/pi-ai/api/azure-openai-responses";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RESOURCE_NAME_ENV = "AZURE_FOUNDRY_RESOURCE_NAME";

export function createFoundryFetch(fetchImpl: FetchFunction): FetchFunction {
  return (input, init) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? input.toString());

    if (url.hostname.endsWith(".services.ai.azure.com") && url.pathname === "/anthropic/v1/messages") {
      url.searchParams.delete("beta");
    }

    return request
      ? fetchImpl(new Request(url, request), init)
      : fetchImpl(url, init);
  };
}

function streamFoundry(
  model: Model<Api>,
  context: Context,
  options?: SimpleStreamOptions,
) {
  if (model.id === "claude-opus-5") {
    return streamAnthropic(
      { ...model, api: "anthropic-messages" } as Model<"anthropic-messages">,
      context,
      { ...options, fetch: createFoundryFetch(options?.fetch ?? globalThis.fetch) },
    );
  }

  return streamAzureOpenAI(
    { ...model, api: "azure-openai-responses" } as Model<"azure-openai-responses">,
    context,
    options,
  );
}

export default function (pi: ExtensionAPI) {
  const resourceName = process.env[RESOURCE_NAME_ENV]?.trim();
  if (!resourceName) {
    throw new Error(`${RESOURCE_NAME_ENV} is required`);
  }

  pi.registerProvider("azure-foundry", {
    name: "Azure AI Foundry",
    baseUrl: `https://${resourceName}.openai.azure.com/openai/v1`,
    apiKey: "$AZURE_FOUNDRY_API_KEY",
    api: "azure-foundry",
    streamSimple: streamFoundry,
    models: [
      {
        id: "claude-opus-5",
        name: "Claude Opus 5 (Azure)",
        baseUrl: `https://${resourceName}.services.ai.azure.com/anthropic`,
        reasoning: true,
        input: ["text", "image"],
        contextWindow: 1_000_000,
        maxTokens: 128_000,
        cost: {
          input: 5,
          output: 25,
          cacheRead: 0.5,
          cacheWrite: 6.25,
        },
        thinkingLevelMap: {
          off: null,
          xhigh: "xhigh",
          max: "max",
        },
        compat: {
          forceAdaptiveThinking: true,
          supportsTemperature: false,
          supportsStrictTools: true,
        },
      },
      {
        id: "gpt-5.6-sol",
        name: "GPT-5.6 Sol (Azure)",
        reasoning: true,
        input: ["text", "image"],
        contextWindow: 1_050_000,
        maxTokens: 128_000,
        cost: {
          input: 4,
          output: 20,
          cacheRead: 0.4,
          cacheWrite: 5,
        },
        thinkingLevelMap: {
          off: null,
          xhigh: "xhigh",
          max: "max",
        },
        compat: {
          supportsOpenAIGrammarTools: true,
        },
      },
    ],
  });
}
