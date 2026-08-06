# 🔌 VLM / LLM API Integration Guide

> This document explains how to switch this project from **Mock scripted data** to **real VLM / LLM APIs**.
>
> Core promise: **zero business-code changes** — implement the Adapter, flip one constant in the registry, and you're done.

---

## 📖 Table of Contents

- [1. Architecture Overview: The Harness Layer & 6 Providers](#1-architecture-overview-the-harness-layer--6-providers)
- [2. VLM vs LLM: Differences & Use Cases](#2-vlm-vs-llm-differences--use-cases)
- [3. Prerequisites: Env Vars & Backend Proxy](#3-prerequisites-env-vars--backend-proxy)
- [4. Common Utility: SSE Parsing & Streaming fetch](#4-common-utility-sse-parsing--streaming-fetch)
- [5. Integrating VLM (Classroom Analysis)](#5-integrating-vlm-classroom-analysis)
- [6. Integrating LLM (Governance / Portal / Capability / Lesson Plan / Slides)](#6-integrating-llm-governance--portal--capability--lesson-plan--slides)
- [7. Switching Providers: One Constant](#7-switching-providers-one-constant)
- [8. Security Notes](#8-security-notes)
- [9. End-to-End Example: Full OpenAIAdapter Implementation](#9-end-to-end-example-full-openaiadapter-implementation)
- [10. FAQ](#10-faq)

---

## 1. Architecture Overview: The Harness Layer & 6 Providers

The project uses a **Harness layer** to fully decouple business logic (Apps layer) from model implementations. The Harness layer defines 6 Provider interfaces, each with two implementations — a **Mock** (scripted) and an **Adapter** (real API skeleton). UI code depends only on the interfaces and is unaware of the underlying implementation:

```
┌─────────────────────────────────────────────────────────────┐
│  Apps Layer (consumes Provider interfaces via for await...of)│
└───────────────────────────┬─────────────────────────────────┘
                            ↓ depends on interface, not impl
┌─────────────────────────────────────────────────────────────┐
│  Harness Layer (6 Provider interfaces)                       │
│                                                              │
│  ① VLMProvider          ── Classroom analysis (multimodal)   │
│  ② CapabilityProvider   ── Wiki/Drill/Game data (VLM or LLM) │
│  ③ GovernanceProvider   ── School governance Agent (LLM)     │
│  ④ PortalProvider       ── Portal AI navigation (LLM)        │
│  ⑤ LessonPlanGenProvider─ Lesson plan draft + chat (LLM)     │
│  ⑥ SlidesGenProvider    ── Slides draft + chat (LLM)         │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ two implementations, pick one
┌─────────────────────────────────────────────────────────────┐
│  Mock (scripted / rule engine, works out of the box)         │
│  Adapter (real-API skeleton — what you fill in here)         │
└─────────────────────────────────────────────────────────────┘
```

### Provider Reference Table

| # | Provider | Interface file | Mock file | Adapter file | Registry | Model type |
|---|---|---|---|---|---|---|
| ① | `VLMProvider` | `src/harness/types.ts` | `MockVLMProvider.ts` | `adapters/{OpenAI,Qwen,VLLM}Adapter.ts` | `providerRegistry.ts` | **VLM** |
| ② | `CapabilityProvider` | `src/harness/types.ts` | `MockCapabilityProvider.ts` | `adapters/CapabilityAdapter.ts` | `providerRegistry.ts` | VLM/LLM |
| ③ | `GovernanceProvider` | `src/harness/types.ts` | `MockGovernanceProvider.ts` | `adapters/GovernanceAdapter.ts` | `providerRegistry.ts` | **LLM** |
| ④ | `PortalProvider` | `src/harness/types.ts` | `MockPortalProvider.ts` | `adapters/PortalAdapter.ts` | `providerRegistry.ts` | **LLM** |
| ⑤ | `LessonPlanGenProvider` | `harness/lessonPlan/types.ts` | `lessonPlan/MockProvider.ts` | `lessonPlan/adapter.ts` | `lessonPlan/index.ts` | **LLM** |
| ⑥ | `SlidesGenProvider` | `harness/slides/types.ts` | `slides/MockProvider.ts` | `slides/adapter.ts` | `slides/index.ts` | **LLM** |

> Note: ①~④ are switched centrally in `providerRegistry.ts`; ⑤⑥ are **physically isolated** independent Harnesses, each switched in its own `index.ts`.

---

## 2. VLM vs LLM: Differences & Use Cases

| Dimension | VLM (Vision-Language Model) | LLM (Large Language Model) |
|---|---|---|
| Input | Image + text | Text only |
| Project use | Classroom analysis: feed classroom frames, produce events/metrics/student observations | Governance briefings, portal navigation, lesson plan/slides generation, knowledge extraction |
| Corresponding Providers | ① VLMProvider (core), ② CapabilityProvider | ③④⑤⑥ |
| Recommended models | GPT-4o, Qwen-VL-Max, Qwen2-VL-7B (local) | GPT-4o, Qwen-Max, DeepSeek, local Qwen2.5 |
| Streaming protocol | SSE (`data: {...}\n\n`) | SSE |
| Key difference | Request body must include `image_url` / `image` field | Request body has only `messages` |

**Who needs VLM vs LLM in this project:**

- **VLM**: `VLMProvider.analyzeStream` — input is classroom video frame samples `FrameSample[]` + transcript `TranscriptLine[]`; the model must "see and describe." `CapabilityAdapter`'s knowledge extraction can also use VLM (read blackboard frames to extract knowledge nodes).
- **LLM**: `GovernanceProvider` (governance briefings/chat), `PortalProvider` (portal navigation), `LessonPlanGenProvider` (lesson plans), `SlidesGenProvider` (slides) — all are text-in, streamed-text-out.

---

## 3. Prerequisites: Env Vars & Backend Proxy

### ⚠️ Important: Browsers must NOT hold apiKey

Vite bundles front-end code, so **any apiKey written into the front-end is exposed to all users** in the build artifact. Two safe approaches:

#### Option A (Recommended): Backend Proxy

The front-end requests the same-origin `/api/llm/*`; your backend (Node/Python/gateway) forwards to the real model API. The apiKey lives only on the backend.

```ts
// In the Adapter:
const resp = await fetch('/api/llm/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, messages, stream: true }),
});
```

Backend example (Node Express):

```js
app.post('/api/llm/chat/completions', async (req, res) => {
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // read on backend
    },
    body: JSON.stringify(req.body),
  });
  // Pipe the SSE stream through
  res.setHeader('Content-Type', 'text/event-stream');
  upstream.body.pipe(res);
});
```

#### Option B: Vite Env Vars (local debugging only)

Create `.env.local` in the project root (ignored by `.gitignore` by default; add it if missing):

```bash
# .env.local (DO NOT commit to git!)
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_API_KEY=sk-xxxxxxxx
VITE_LLM_MODEL=gpt-4o
```

Access via `import.meta.env.VITE_*` in Vite. In the Adapter:

```ts
const baseURL = import.meta.env.VITE_LLM_BASE_URL as string;
const apiKey = import.meta.env.VITE_LLM_API_KEY as string;
const model = import.meta.env.VITE_LLM_MODEL as string;
```

> ⚠️ Option B's key is baked into the build artifact — **local debugging only**. Production must use Option A.

---

## 4. Common Utility: SSE Parsing & Streaming fetch

All streaming Providers (VLM/Governance/Portal/LessonPlan/Slides) follow the same pattern: call the model's SSE endpoint → parse `data:` lines → wrap incremental tokens into project-defined chunks and `yield` them. Reuse this utility code.

Create `src/harness/adapters/sseUtils.ts`:

```ts
/**
 * SSE streaming parser utility
 * Works with OpenAI-compatible / DashScope / vLLM (all SSE, data: {...})
 */

/** Read a fetch Response stream, yielding parsed JSON from each SSE data line */
export async function* parseSSE<T = any>(
  resp: Response,
  signal?: AbortSignal,
): AsyncIterable<T> {
  if (!resp.body) throw new Error('Response body is empty');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events separated by \n\n; process line by line
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // last line may be incomplete, keep for next round

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          yield JSON.parse(data) as T;
        } catch {
          // non-JSON data line (e.g. heartbeat), skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Extract incremental text token from an OpenAI-compatible SSE event */
export function extractDeltaText(chunk: any): string {
  // OpenAI / vLLM / most compatible services use this field
  return chunk?.choices?.[0]?.delta?.content ?? '';
}

/** Create an AbortController for use in Provider.cancel() */
export function createAbortController(): AbortController {
  return new AbortController();
}
```

---

## 5. Integrating VLM (Classroom Analysis)

`VLMProvider` is the project's core — feed classroom frames to a VLM and stream out analysis chunks. Interface defined in `src/harness/types.ts`:

```ts
export interface VLMProvider {
  readonly name: string;
  analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk>;
  cancel?(sessionId: string): void;
}
```

### 5.1 Three Ready-Made Adapter Skeletons

The project ships 3 VLM Adapters — pick one based on your deployment:

| Adapter | Use case | Default baseURL | Default model |
|---|---|---|---|
| `adapters/OpenAIAdapter.ts` | Official OpenAI / any OpenAI-compatible service | `https://api.openai.com/v1` | `gpt-4o` |
| `adapters/QwenAdapter.ts` | Alibaba Qwen-VL (DashScope) | `https://dashscope.aliyuncs.com/api/v1` | `qwen-vl-max` |
| `adapters/VLLMAdapter.ts` | Local vLLM deployment (e.g. Qwen2-VL-7B int4) | `http://localhost:8000/v1` | `Qwen/Qwen2-VL-7B-Instruct` |

### 5.2 Input & Output Data Contracts

**Input** `AnalysisInput` (what you receive):

```ts
interface AnalysisInput {
  scenario: 'classroom' | 'pe' | 'lab' | 'workshop' | 'microlesson';
  mode: 'realtime' | 'playback';
  role: 'teacher' | 'student' | 'admin';
  studentId?: string;          // focus when student view
  frames: FrameSample[];       // video frame samples (each has t, snapshot desc, optional metrics)
  transcript: TranscriptLine[];// audio transcript
  startFrom?: number;          // playback start (seconds)
  speed?: number;              // playback speed multiplier
}
```

**Output** `AnalysisChunk` (what you yield):

```ts
interface AnalysisChunk {
  type: 'text' | 'event' | 'metric' | 'frame_ref' | 'student' | 'wiki';
  content: string;
  timestamp: number;     // corresponding classroom time (seconds)
  confidence?: number;
  label?: string;
  studentId?: string;    // required when type='student'
  wikiNodeId?: string;   // required when type='wiki'
}
```

### 5.3 Implementation Notes

The key to VLM integration is assembling `FrameSample.snapshot` (scene description) and `TranscriptLine` into a multimodal prompt that makes the model produce structured analysis. **Two strategies:**

#### Strategy 1: Real-time per-frame analysis (closest to a real VLM)

Call the VLM once per frame, passing the current frame's `snapshot` description + nearby transcript as input, asking the model to output the analysis chunk for that moment.

#### Strategy 2: Batch input + streamed output (saves tokens)

Concatenate all frame descriptions + transcript into one large prompt, asking the VLM to stream `AnalysisChunk` (JSON Lines) along the timeline.

> 💡 **When you don't have real video frame images**: `FrameSample.snapshot` is a textual scene description (e.g. "teacher writing Newton's second law on the blackboard"). In this case the VLM is effectively "reading text descriptions to analyze." If you have real classroom photos, pass them as `image_url` to the VLM (see Section 9 example).

---

## 6. Integrating LLM (Governance / Portal / Capability / Lesson Plan / Slides)

These Providers are all text-only LLMs with a highly consistent integration pattern: **serialize context into a prompt → call the LLM SSE endpoint → parse tokens → wrap into project chunks and yield**.

### 6.1 GovernanceProvider (School Governance)

File: `adapters/GovernanceAdapter.ts`

Four methods:

| Method | Mode | Input | Output |
|---|---|---|---|
| `streamBriefing(ctx)` | Streaming | `GovernanceContext` (raw sessions/teachers + aggregates) | `AsyncIterable<GovernanceChunk>` |
| `streamInsight(query, ctx)` | Streaming | User question + `GovernanceContext` | `AsyncIterable<GovernanceChunk>` |
| `detectAnomalies(ctx)` | Promise | `GovernanceContext` | `Promise<AnomalyAlert[]>` |
| `suggestResearch(target, ctx)` | Promise | Target object + `GovernanceContext` | `Promise<ResearchSuggestion>` |

**Implementation notes:**

- `streamBriefing`: serialize `ctx.aggregates` (school overview / class comparison / subject comparison / teacher comparison / trends) into the system prompt; ask the LLM to stream a governance briefing; yield one `GovernanceChunk` per semantic segment (`type: 'insight'|'alert'|'suggestion'`).
- `streamInsight`: `query` as user message, `ctx` as system context, stream back.
- `detectAnomalies` / `suggestResearch`: use **JSON mode** (OpenAI's `response_format: { type: 'json_object' }`) to get structured JSON, then `JSON.parse` into the target type.

`GovernanceChunk` structure:

```ts
interface GovernanceChunk {
  type: 'insight' | 'alert' | 'suggestion' | 'metric_ref';
  content: string;
  refId?: string;                              // referenced data ID (for chart highlight linkage)
  severity?: 'info' | 'warning' | 'critical';
}
```

### 6.2 PortalProvider (Portal Navigation)

File: `adapters/PortalAdapter.ts`

Three methods:

| Method | Mode | Description |
|---|---|---|
| `streamNavigate(query, ctx)` | Streaming | query + role app list + data summary → streamed nav/insight chunks |
| `getQuickNav(role)` | Sync | Returns role-level quick nav entries (LLM-pre-generated or static config) |
| `getSuggestionChips(role)` | Sync | Returns role-level common-question chips |

`PortalNavChunk` structure:

```ts
interface PortalNavChunk {
  type: 'nav_result' | 'insight' | 'suggestion' | 'data_ref';
  content: string;
  appId?: string;        // required for nav_result; UI can openWindow directly
  appName?: string;
  appIcon?: string;
  refId?: string;
  severity?: 'info' | 'warning' | 'critical';
}
```

### 6.3 CapabilityProvider (Wiki / Drill / Games)

File: `adapters/CapabilityAdapter.ts`

Three Promise methods; can use VLM (read blackboard frames) or LLM (based on text analysis results):

| Method | Output | Implementation suggestion |
|---|---|---|
| `getWiki(scenario)` | `Promise<WikiContainer>` | Send analysis results to LLM; extract knowledge nodes + relations + assistant scripts (JSON mode) |
| `getSimulation(scenario)` | `Promise<SimulationScript>` | Ask LLM to derive virtual student behavior scripts + teacher response branches with scores |
| `getGames(scenario)` | `Promise<GameModule[]>` | Generate questions from wiki nodes (choice/match/connect) |

### 6.4 LessonPlanGenProvider (Lesson Plan)

File: `src/harness/lessonPlan/adapter.ts` (independent Harness, physically isolated)

```ts
interface LessonPlanGenProvider {
  streamDraft(input: LessonPlanDraftInput): AsyncIterable<LessonPlanGenChunk>;
  streamChat(input: LessonPlanChatInput): AsyncIterable<LessonPlanGenChunk>;
}
```

**Implementation notes:**

- `streamDraft`: system prompt requires **Markdown lesson plan** output (with title / objectives / key points / teaching process / homework structure); stream yield `{ type: 'text', content: token }`.
- `streamChat`: use `currentContent` (current editor markdown) as context; answer user follow-ups; supports "append to editor" / "replace editor" refill.
- Recommend accumulating tokens into "lines" before yielding to avoid per-character jitter.

### 6.5 SlidesGenProvider (Slides)

File: `src/harness/slides/adapter.ts` (independent Harness, physically isolated)

```ts
interface SlidesGenProvider {
  streamDraft(input: SlidesDraftInput): AsyncIterable<SlidesGenChunk>;
  streamChat(input: SlidesChatInput): AsyncIterable<SlidesGenChunk>;
}
```

**Implementation notes (key difference from lesson plan):**

- System prompt requires `---`-separated slide markdown output.
- When parsing SSE tokens, yield `{ type: 'section_break' }` on `---` and increment `slideIndex`.
- The `design` param (`classic`/`modern`/`dataviz`) affects template emphasis, e.g. `dataviz` favors tables.

---

## 7. Switching Providers: One Constant

Once the Adapter is implemented, flip a single constant to activate it.

### 7.1 Central Registry (①②③④)

Edit `src/harness/providerRegistry.ts`; change the corresponding `ACTIVE_*` constant from `'mock'` to the target:

```ts
// VLMProvider: pick one
const ACTIVE_PROVIDER = 'openai';   // or 'qwen' | 'vllm'

// CapabilityProvider
const ACTIVE_CAPABILITY_PROVIDER = 'api';

// GovernanceProvider
const ACTIVE_GOVERNANCE_PROVIDER = 'api';

// PortalProvider
const ACTIVE_PORTAL_PROVIDER = 'api';
```

### 7.2 Independent Harnesses (⑤⑥)

- Lesson plan: edit `src/harness/lessonPlan/index.ts`
  ```ts
  const ACTIVE = 'api';
  ```
- Slides: edit `src/harness/slides/index.ts`
  ```ts
  const ACTIVE = 'api';
  ```

> 🎉 **That's it.** No need to touch any App component, Store, or UI code — they depend only on the Provider interfaces.

---

## 8. Security Notes

1. **Never hardcode apiKey in the front-end.** Production must use a backend proxy (Option A).
2. `.env.local` is for local debugging only; confirm `.gitignore` includes `.env*`:
   ```
   .env
   .env.local
   .env.*.local
   ```
3. The backend proxy layer should handle: auth, rate limiting, key rotation, log redaction.
4. VLM requests may contain classroom images with student faces — ensure compliance (anonymization / on-device processing / proper authorization).
5. Governance data (`GovernanceContext.raw`) contains teacher performance — it's sensitive. Use HTTPS, don't log details.

---

## 9. End-to-End Example: Full OpenAIAdapter Implementation

Using `VLMProvider`'s OpenAI-compatible Adapter as an example, here's the complete code to switch from Mock to a real API. Other LLM Adapters are analogous (just drop `image_url`).

### 9.1 Implement the Adapter

Replace the contents of `src/harness/adapters/OpenAIAdapter.ts`:

```ts
import type { AnalysisChunk, AnalysisInput, VLMProvider } from '../types';
import { parseSSE, extractDeltaText, createAbortController } from './sseUtils';

/**
 * OpenAI-compatible VLM Adapter
 * Works with OpenAI GPT-4o, Azure OpenAI, local vLLM, and any OpenAI-compatible service.
 *
 * For production, route through a backend proxy at /api/llm/* that injects the apiKey.
 */
export class OpenAIAdapter implements VLMProvider {
  readonly name = 'OpenAI Compatible VLM Adapter';

  // Dev: use env vars; prod: baseURL points to backend proxy
  private baseURL = import.meta.env.VITE_LLM_BASE_URL || '/api/llm';
  private apiKey = import.meta.env.VITE_LLM_API_KEY || '';  // leave empty when proxied
  private model = import.meta.env.VITE_LLM_MODEL || 'gpt-4o';

  private controllers = new Map<string, AbortController>();

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    const sessionId = `${input.scenario}-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    try {
      // 1. Build the multimodal prompt
      const messages = this.buildMessages(input);

      // 2. Call the OpenAI-compatible streaming endpoint
      const resp = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`VLM API ${resp.status}: ${await resp.text()}`);
      }

      // 3. Parse SSE, accumulate tokens into AnalysisChunks and yield
      let textBuffer = '';
      let currentT = input.startFrom ?? 0;

      for await (const chunk of parseSSE(resp, controller.signal)) {
        const token = extractDeltaText(chunk);
        if (!token) continue;

        textBuffer += token;

        // Simplified strategy: yield accumulated text as a chunk on newline.
        // Advanced: ask the LLM for JSON Lines and parse by type.
        if (textBuffer.includes('\n')) {
          const lines = textBuffer.split('\n');
          textBuffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            yield {
              type: 'text',
              content: trimmed,
              timestamp: currentT,
            };
          }
        }
      }

      // flush remainder
      if (textBuffer.trim()) {
        yield { type: 'text', content: textBuffer.trim(), timestamp: currentT };
      }
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  /** Build multimodal messages: system + user (with frame desc / transcript / optional image) */
  private buildMessages(input: AnalysisInput) {
    const sceneDesc = input.frames
      .map((f) => `[t=${f.t}s] ${f.snapshot}`)
      .join('\n');
    const transcript = input.transcript
      .map((t) => `[t=${t.t}s][${t.speaker}] ${t.text}`)
      .join('\n');

    return [
      {
        role: 'system',
        content: `You are a classroom observation expert. Based on the classroom scene description and transcript, stream analysis along the timeline.
Output: one analysis per line as JSON: {"type":"text|event|metric","content":"...","timestamp":N}
type values: text(analysis text)/event(key event)/metric(metric snapshot).`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Scenario: ${input.scenario}\n\nFrames:\n${sceneDesc}\n\nTranscript:\n${transcript}` },
          // If you have real classroom images, add image_url:
          // { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } },
        ],
      },
    ];
  }

  cancel(sessionId: string): void {
    const controller = this.controllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.controllers.delete(sessionId);
    }
  }
}
```

### 9.2 Create the SSE Utility File

Create `src/harness/adapters/sseUtils.ts` per Section 4.

### 9.3 Flip the Registry

Edit `src/harness/providerRegistry.ts`:

```ts
const ACTIVE_PROVIDER = 'openai';
```

### 9.4 Configure Env Vars (dev)

Create `.env.local`:

```bash
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_API_KEY=sk-your-key-here
VITE_LLM_MODEL=gpt-4o
```

### 9.5 Verify

```bash
npm run dev
```

Open a classroom analysis scenario — you should now see real VLM streaming output (instead of the scripted mock).

---

## 10. FAQ

### Q1: The VLM output isn't structured — how does the UI render it?

The project UI has different render branches per `AnalysisChunk.type`. If the VLM only outputs plain text, yielding everything as `type: 'text'` still works (falls through to the default text-stream renderer). To trigger event/metric/student cards, constrain the LLM to output JSON Lines in the prompt and parse before yielding. Section 9 shows the basic text stream; for advanced usage, constrain the output format in `buildMessages`'s system prompt and convert with `JSON.parse` before yielding.

### Q2: The stream is too slow/fast — it doesn't sync with the video timeline.

The Mock Provider uses `sleep` to align with `chunk.timestamp`. For real Adapters in playback mode, you can `await sleep((chunk.timestamp - lastT) * 1000 / speed)` before yielding. Realtime mode usually needs no artificial delay.

### Q3: How do I integrate a local vLLM deployment?

vLLM exposes an OpenAI-compatible protocol by default (`http://localhost:8000/v1`). Use `VLLMAdapter` (essentially a local variant of OpenAIAdapter): set `baseURL` to `http://localhost:8000/v1`, `apiKey` to `'EMPTY'`, and `model` to your model name (e.g. `Qwen/Qwen2-VL-7B-Instruct`). Recommend enabling `--chat-template` and multimodal `image_url` support.

### Q4: How do I use JSON mode for the Governance Provider?

`detectAnomalies` / `suggestResearch` return structured objects — use OpenAI's JSON mode:

```ts
const resp = await fetch(`${baseURL}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model,
    messages: [{ role: 'system', content: 'Output AnomalyAlert[] JSON...' }, ...],
    response_format: { type: 'json_object' },  // key
  }),
});
const data = await resp.json();
const alerts = JSON.parse(data.choices[0].message.content) as AnomalyAlert[];
```

### Q5: Can I integrate only some Providers and keep others on Mock?

Yes. Each Provider switches independently. For example, integrate only the real governance LLM and keep the rest scripted:

```ts
const ACTIVE_PROVIDER = 'mock';              // classroom analysis stays scripted
const ACTIVE_CAPABILITY_PROVIDER = 'mock';
const ACTIVE_GOVERNANCE_PROVIDER = 'api';    // governance uses real LLM
const ACTIVE_PORTAL_PROVIDER = 'mock';
```

### Q6: How do the Lesson Plan / Slides Adapters differ from the Governance Adapter?

They are **physically isolated** independent Harnesses — their registries are not in `providerRegistry.ts` but in their own `index.ts`. Their types are also self-defined (`LessonPlanGenChunk` / `SlidesGenChunk` vs `GovernanceChunk`) with no mutual dependencies. However, the LLM call pattern is identical — reuse the `parseSSE` utility from Section 4.

---

<div align="center">

**🔌 Integrating a real API takes three steps: implement the Adapter → flip the constant → configure env vars**

</div>
