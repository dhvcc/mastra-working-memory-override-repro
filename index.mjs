import { Agent } from "@mastra/core/agent";
import { InMemoryStore } from "@mastra/core/storage";
import { Memory } from "@mastra/memory";

const CUSTOM = "CUSTOM WORKING MEMORY INSTRUCTION: only store what the user explicitly asks you to remember.";

// The workaround suggested in #14345: extend Memory and override the instruction.
class StrictMemory extends Memory {
  getWorkingMemoryToolInstruction() {
    return CUSTOM;
  }
}

// A mock model that records the system prompt it receives and replies with plain text.
let systemPrompt = "";
const model = {
  specificationVersion: "v2",
  provider: "mock",
  modelId: "mock",
  supportedUrls: {},
  async doGenerate({ prompt }) {
    systemPrompt = prompt.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    return { content: [{ type: "text", text: "Hi!" }], finishReason: "stop", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, warnings: [] };
  },
  async doStream({ prompt }) {
    systemPrompt = prompt.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({ type: "text-start", id: "t" });
          controller.enqueue({ type: "text-delta", id: "t", delta: "Hi!" });
          controller.enqueue({ type: "text-end", id: "t" });
          controller.enqueue({ type: "finish", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } });
          controller.close();
        },
      }),
    };
  },
};

const memory = new StrictMemory({ storage: new InMemoryStore(), options: { workingMemory: { enabled: true } } });
const agent = new Agent({ id: "assistant", name: "assistant", instructions: "You are helpful.", model, memory });

await agent.generate("Hello", { memory: { thread: "thread-1", resource: "user-1" } });

// Memory's own system message does use the override, so the method is wired up there.
const memorySystemMessage = await memory.getSystemMessage({ threadId: "thread-1", resourceId: "user-1" });
console.log({ memoryGetSystemMessageUsesOverride: Boolean(memorySystemMessage?.includes(CUSTOM)) });

const usesOverride = systemPrompt.includes(CUSTOM);
const usesBuiltIn = systemPrompt.includes("If you're unsure whether to store something, store it");
console.log({ usesOverride, usesBuiltIn });
console.log(usesOverride && !usesBuiltIn ? "OK: override applied" : "BUG: the Memory override is ignored; the built-in instruction was sent");
process.exitCode = usesOverride && !usesBuiltIn ? 0 : 1;
