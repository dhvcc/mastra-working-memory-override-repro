# Memory.getWorkingMemoryToolInstruction override is ignored by agents

In [mastra-ai/mastra#14345](https://github.com/mastra-ai/mastra/issues/14345) the suggested way to change the working memory instruction was to extend `Memory`.
`Memory.getWorkingMemoryToolInstruction` is `protected`, so a subclass can override it, and
`memory.getSystemMessage()` does use the override. But an `Agent` gets its working memory
instruction from the `WorkingMemory` input processor in `@mastra/core`, which has its own
`private getWorkingMemoryToolInstruction` copy of the text. The override never reaches the model.

## Run

```bash
npm install
npm start
```

No API key needed: the model is a mock that records the system prompt it receives.

## Expected

```
{ memoryGetSystemMessageUsesOverride: true }
{ usesOverride: true, usesBuiltIn: false }
OK: override applied
```

## Actual (@mastra/core 1.82.0, @mastra/memory 1.41.0, Node 24.15.0)

```
{ memoryGetSystemMessageUsesOverride: true }
{ usesOverride: false, usesBuiltIn: true }
BUG: the Memory override is ignored; the built-in instruction was sent
```
