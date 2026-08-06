# 🔌 VLM / LLM API 接入指南

> 本文档说明如何把本项目从 **Mock 预制剧本** 切换到 **真实 VLM / LLM API**。
>
> 核心承诺：**业务代码一行不改** —— 你只需要实现 Adapter，再在注册中心切换一个常量。

---

## 📖 目录

- [一、架构总览：Harness 层与 6 个 Provider](#一架构总览harness-层与-6-个-provider)
- [二、VLM 与 LLM 的区别与接入场景](#二vlm-与-llm-的区别与接入场景)
- [三、前置准备：环境变量与后端代理](#三前置准备环境变量与后端代理)
- [四、通用工具：SSE 解析与流式 fetch](#四通用工具sse-解析与流式-fetch)
- [五、接入 VLM（课堂分析）](#五接入-vlm课堂分析)
- [六、接入 LLM（治理 / 门户 / 能力 / 教案 / 课件）](#六接入-llm治理--门户--能力--教案--课件)
- [七、切换 Provider：一行常量](#七切换-provider一行常量)
- [八、安全注意事项](#八安全注意事项)
- [九、端到端示例：OpenAIAdapter 完整实现](#九端到端示例openaiadapter-完整实现)
- [十、常见问题](#十常见问题)

---

## 一、架构总览：Harness 层与 6 个 Provider

项目采用 **Harness 层** 把业务（Apps 层）与模型实现完全解耦。Harness 层定义了 6 个 Provider 接口，每个接口都有「Mock 实现」+「Adapter 占位」两套实现，UI 只依赖接口，不感知底层：

```
┌─────────────────────────────────────────────────────────────┐
│  Apps 层（只消费 Provider 接口，用 for await...of 拿 chunk）   │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ 依赖接口，不依赖实现
┌─────────────────────────────────────────────────────────────┐
│  Harness 层（6 个 Provider 接口）                              │
│                                                              │
│  ① VLMProvider          ── 课堂分析（多模态，视觉+语言）        │
│  ② CapabilityProvider   ── 知识WIKI/演练/游戏取数（可VLM可LLM）│
│  ③ GovernanceProvider   ── 学校治理 Agent（LLM）              │
│  ④ PortalProvider       ── 门户 AI 检索导航（LLM）            │
│  ⑤ LessonPlanGenProvider─ 教案草稿生成+微调（LLM）            │
│  ⑥ SlidesGenProvider    ── 课件草稿生成+微调（LLM）           │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ 两套实现，二选一
┌─────────────────────────────────────────────────────────────┐
│  Mock 实现（预制剧本/规则引擎，开箱即用）                       │
│  Adapter 实现（接入真实 API 的骨架，本文档要填的）              │
└─────────────────────────────────────────────────────────────┘
```

### Provider 一览表

| # | Provider | 接口文件 | Mock 文件 | Adapter 文件 | 注册中心 | 模型类型 |
|---|---|---|---|---|---|---|
| ① | `VLMProvider` | `src/harness/types.ts` | `MockVLMProvider.ts` | `adapters/{OpenAI,Qwen,VLLM}Adapter.ts` | `providerRegistry.ts` | **VLM** |
| ② | `CapabilityProvider` | `src/harness/types.ts` | `MockCapabilityProvider.ts` | `adapters/CapabilityAdapter.ts` | `providerRegistry.ts` | VLM/LLM |
| ③ | `GovernanceProvider` | `src/harness/types.ts` | `MockGovernanceProvider.ts` | `adapters/GovernanceAdapter.ts` | `providerRegistry.ts` | **LLM** |
| ④ | `PortalProvider` | `src/harness/types.ts` | `MockPortalProvider.ts` | `adapters/PortalAdapter.ts` | `providerRegistry.ts` | **LLM** |
| ⑤ | `LessonPlanGenProvider` | `harness/lessonPlan/types.ts` | `lessonPlan/MockProvider.ts` | `lessonPlan/adapter.ts` | `lessonPlan/index.ts` | **LLM** |
| ⑥ | `SlidesGenProvider` | `harness/slides/types.ts` | `slides/MockProvider.ts` | `slides/adapter.ts` | `slides/index.ts` | **LLM** |

> 注意：①~④ 在中央注册中心 `providerRegistry.ts` 统一切换；⑤⑥ 是**物理隔离**的独立 Harness，各自在自己的 `index.ts` 切换。

---

## 二、VLM 与 LLM 的区别与接入场景

| 维度 | VLM（视觉语言模型） | LLM（大语言模型） |
|---|---|---|
| 输入 | 图像 + 文本 | 纯文本 |
| 本项目用途 | 课堂分析：给课堂画面，产出事件/指标/学生观察 | 治理简报、门户导航、教案/课件生成、知识抽取 |
| 对应 Provider | ① VLMProvider（核心）、② CapabilityProvider | ③④⑤⑥ |
| 推荐模型 | GPT-4o、Qwen-VL-Max、Qwen2-VL-7B（本地） | GPT-4o、Qwen-Max、DeepSeek、本地 Qwen2.5 |
| 流式协议 | SSE（`data: {...}\n\n`） | SSE |
| 关键差异 | 请求体需带 `image_url` / `image` 字段 | 请求体只有 `messages` |

**本项目里谁要接 VLM、谁要接 LLM：**

- **接 VLM**：`VLMProvider.analyzeStream` —— 输入是课堂视频帧采样 `FrameSample[]` + 转录 `TranscriptLine[]`，需要模型"看图说话"。`CapabilityAdapter` 中的知识抽取也可选用 VLM（看板书画面抽知识节点）。
- **接 LLM**：`GovernanceProvider`（治理简报/对话）、`PortalProvider`（门户导航）、`LessonPlanGenProvider`（教案）、`SlidesGenProvider`（课件）—— 都是纯文本 prompt → 流式文本输出。

---

## 三、前置准备：环境变量与后端代理

### ⚠️ 重要：浏览器不能直接持有 apiKey

Vite 打包的是前端代码，**apiKey 一旦写进前端就会随构建产物暴露给所有用户**。有两种安全做法：

#### 方案 A（推荐）：后端代理

前端请求同源的 `/api/llm/*`，由你的后端（Node/Python/网关）转发到真实模型 API，apiKey 只存在后端。

```ts
// Adapter 里这样写
const resp = await fetch('/api/llm/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, messages, stream: true }),
});
```

后端示例（Node Express）：

```js
app.post('/api/llm/chat/completions', async (req, res) => {
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // 后端读取
    },
    body: JSON.stringify(req.body),
  });
  // 透传 SSE 流
  res.setHeader('Content-Type', 'text/event-stream');
  upstream.body.pipe(res);
});
```

#### 方案 B：开发期用 Vite 环境变量（仅本地调试）

在项目根目录新建 `.env.local`（已被 `.gitignore` 默认忽略，如没有请补上）：

```bash
# .env.local （不要提交到 git！）
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_API_KEY=sk-xxxxxxxx
VITE_LLM_MODEL=gpt-4o
```

在 Vite 配置中已可通过 `import.meta.env.VITE_*` 访问。Adapter 里这样读：

```ts
const baseURL = import.meta.env.VITE_LLM_BASE_URL as string;
const apiKey = import.meta.env.VITE_LLM_API_KEY as string;
const model = import.meta.env.VITE_LLM_MODEL as string;
```

> ⚠️ 方案 B 的 key 会打进构建产物，**仅限本地调试**，生产环境必须用方案 A。

---

## 四、通用工具：SSE 解析与流式 fetch

所有流式 Provider（VLM/治理/门户/教案/课件）都遵循同一套模式：调模型 SSE 接口 → 解析 `data:` 行 → 把增量 token 包装成项目定义的 chunk `yield`。建议把这段工具代码复用。

新建 `src/harness/adapters/sseUtils.ts`：

```ts
/**
 * SSE 流式解析工具
 * 适用于 OpenAI 兼容协议 / DashScope / vLLM（都是 SSE，data: {...}）
 */

/** 读取 fetch Response 的流，逐行产出 SSE 的 data 段（已 JSON.parse） */
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

      // SSE 以 \n\n 分隔事件，按行处理
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // 最后一行可能不完整，留到下次

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          yield JSON.parse(data) as T;
        } catch {
          // 非 JSON 的 data 行（如心跳），跳过
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** OpenAI 兼容 SSE 事件中提取增量文本 token */
export function extractDeltaText(chunk: any): string {
  // OpenAI / vLLM / 多数兼容服务的字段
  return chunk?.choices?.[0]?.delta?.content ?? '';
}

/** 创建 AbortController，用于 Provider.cancel() */
export function createAbortController(): AbortController {
  return new AbortController();
}
```

---

## 五、接入 VLM（课堂分析）

`VLMProvider` 是本项目的核心 —— 把课堂画面喂给 VLM，流式产出分析 chunk。接口定义见 `src/harness/types.ts`：

```ts
export interface VLMProvider {
  readonly name: string;
  analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk>;
  cancel?(sessionId: string): void;
}
```

### 5.1 三个现成 Adapter 骨架

项目已预留 3 个 VLM Adapter，按你的部署方式选一个填实现：

| Adapter | 适用场景 | baseURL 默认值 | model 默认值 |
|---|---|---|---|
| `adapters/OpenAIAdapter.ts` | OpenAI 官方 / 任何 OpenAI 兼容服务 | `https://api.openai.com/v1` | `gpt-4o` |
| `adapters/QwenAdapter.ts` | 阿里通义千问 Qwen-VL（DashScope） | `https://dashscope.aliyuncs.com/api/v1` | `qwen-vl-max` |
| `adapters/VLLMAdapter.ts` | 本地 vLLM 部署（如 Qwen2-VL-7B int4） | `http://localhost:8000/v1` | `Qwen/Qwen2-VL-7B-Instruct` |

### 5.2 输入与输出的数据契约

**输入** `AnalysisInput`（你拿到什么）：

```ts
interface AnalysisInput {
  scenario: 'classroom' | 'pe' | 'lab' | 'workshop' | 'microlesson';
  mode: 'realtime' | 'playback';
  role: 'teacher' | 'student' | 'admin';
  studentId?: string;          // 学生视角时聚焦
  frames: FrameSample[];       // 视频帧采样（每帧有 t、snapshot 描述、可选 metrics）
  transcript: TranscriptLine[];// 音频转写
  startFrom?: number;          // 回放起点（秒）
  speed?: number;              // 回放倍速
}
```

**输出** `AnalysisChunk`（你要 yield 什么）：

```ts
interface AnalysisChunk {
  type: 'text' | 'event' | 'metric' | 'frame_ref' | 'student' | 'wiki';
  content: string;
  timestamp: number;     // 对应课堂时间（秒）
  confidence?: number;
  label?: string;
  studentId?: string;    // type='student' 时必填
  wikiNodeId?: string;   // type='wiki' 时必填
}
```

### 5.3 实现要点

VLM 接入的关键是把 `FrameSample.snapshot`（场景描述）和 `TranscriptLine` 组装成多模态 prompt，让模型产出结构化分析。**两种实现策略：**

#### 策略一：让 VLM 实时逐帧分析（最贴近真实 VLM）

每一帧调用一次 VLM，把当前帧的 `snapshot` 描述 + 时间点附近的转录作为输入，要求模型输出该时刻的分析 chunk。

#### 策略二：批量送入 + 流式产出（更省 token）

把整段课堂的帧描述 + 转录拼成一个大 prompt，要求 VLM 按时间线流式输出 `AnalysisChunk`（JSON Lines）。

> 💡 **没有真实视频帧图像时**：`FrameSample.snapshot` 是文本场景描述（如"教师在黑板前板书牛顿第二定律"），此时 VLM 实际上是"读文本描述做分析"。若你有真实课堂图片，应把图片作为 `image_url` 传给 VLM（见第九节示例）。

---

## 六、接入 LLM（治理 / 门户 / 能力 / 教案 / 课件）

这些 Provider 都是纯文本 LLM，接入模式高度一致：**把上下文序列化为 prompt → 调 LLM SSE 接口 → 解析 token → 包装成项目 chunk yield**。

### 6.1 GovernanceProvider（学校治理）

文件：`adapters/GovernanceAdapter.ts`

四个方法：

| 方法 | 模式 | 输入 | 输出 |
|---|---|---|---|
| `streamBriefing(ctx)` | 流式 | `GovernanceContext`（含 raw 会话/教师数据 + aggregates 聚合统计） | `AsyncIterable<GovernanceChunk>` |
| `streamInsight(query, ctx)` | 流式 | 用户提问 + `GovernanceContext` | `AsyncIterable<GovernanceChunk>` |
| `detectAnomalies(ctx)` | Promise | `GovernanceContext` | `Promise<AnomalyAlert[]>` |
| `suggestResearch(target, ctx)` | Promise | 目标对象 + `GovernanceContext` | `Promise<ResearchSuggestion>` |

**实现要点：**

- `streamBriefing`：把 `ctx.aggregates`（学校概览/班级对比/学科对比/教师对比/趋势）序列化进 system prompt，要求 LLM 流式产出治理简报，每个语义段 yield 一个 `GovernanceChunk`（`type: 'insight'|'alert'|'suggestion'`）。
- `streamInsight`：`query` 作为 user message，`ctx` 作为 system context，流式返回。
- `detectAnomalies` / `suggestResearch`：用 **JSON mode**（OpenAI 的 `response_format: { type: 'json_object' }`）让 LLM 输出结构化 JSON，再 `JSON.parse` 成目标类型。

`GovernanceChunk` 结构：

```ts
interface GovernanceChunk {
  type: 'insight' | 'alert' | 'suggestion' | 'metric_ref';
  content: string;
  refId?: string;                              // 引用的数据 ID（图表联动高亮）
  severity?: 'info' | 'warning' | 'critical';
}
```

### 6.2 PortalProvider（门户导航）

文件：`adapters/PortalAdapter.ts`

三个方法：

| 方法 | 模式 | 说明 |
|---|---|---|
| `streamNavigate(query, ctx)` | 流式 | query + 角色应用清单 + 数据摘要 → 流式产出导航/洞察 chunk |
| `getQuickNav(role)` | 同步 | 返回角色级快捷导航项（可由 LLM 预生成或静态配置） |
| `getSuggestionChips(role)` | 同步 | 返回角色级常见提问 chip |

`PortalNavChunk` 结构：

```ts
interface PortalNavChunk {
  type: 'nav_result' | 'insight' | 'suggestion' | 'data_ref';
  content: string;
  appId?: string;        // nav_result 时必填，UI 可直接 openWindow
  appName?: string;
  appIcon?: string;
  refId?: string;
  severity?: 'info' | 'warning' | 'critical';
}
```

### 6.3 CapabilityProvider（知识 WIKI / 演练 / 游戏）

文件：`adapters/CapabilityAdapter.ts`

三个 Promise 方法，可选用 VLM（看板书画面）或 LLM（基于文本分析结果）：

| 方法 | 输出 | 实现建议 |
|---|---|---|
| `getWiki(scenario)` | `Promise<WikiContainer>` | 把课堂分析结果送 LLM，抽取知识节点 + 关联 + 助手脚本（JSON mode） |
| `getSimulation(scenario)` | `Promise<SimulationScript>` | 让 LLM 派生虚拟学生行为剧本 + 教师应对分支评分 |
| `getGames(scenario)` | `Promise<GameModule[]>` | 根据 wiki 节点生成题目（choice/match/connect） |

### 6.4 LessonPlanGenProvider（教案）

文件：`src/harness/lessonPlan/adapter.ts`（独立 Harness，物理隔离）

```ts
interface LessonPlanGenProvider {
  streamDraft(input: LessonPlanDraftInput): AsyncIterable<LessonPlanGenChunk>;
  streamChat(input: LessonPlanChatInput): AsyncIterable<LessonPlanGenChunk>;
}
```

**实现要点：**

- `streamDraft`：system prompt 要求输出 **Markdown 教案**（含标题/教学目标/重难点/教学过程/作业等结构），流式 yield `{ type: 'text', content: token }`。
- `streamChat`：把 `currentContent`（当前编辑器 markdown）作为上下文，回答用户追问，支持「追加到编辑器」「替换编辑器」回填。
- 建议 token 累积成"行"再 yield，避免逐字符抖动。

### 6.5 SlidesGenProvider（课件）

文件：`src/harness/slides/adapter.ts`（独立 Harness，物理隔离）

```ts
interface SlidesGenProvider {
  streamDraft(input: SlidesDraftInput): AsyncIterable<SlidesGenChunk>;
  streamChat(input: SlidesChatInput): AsyncIterable<SlidesGenChunk>;
}
```

**实现要点（与教案的关键差异）：**

- system prompt 要求用 `---` 分页输出幻灯片 markdown。
- 解析 SSE token 时，遇到 `---` 要 yield `{ type: 'section_break' }`，并递增 `slideIndex`。
- `design` 参数（`classic`/`modern`/`dataviz`）影响模板侧重，如 `dataviz` 多表格。

---

## 七、切换 Provider：一行常量

Adapter 实现完成后，只需改一个常量即可生效。

### 7.1 中央注册中心（①②③④）

编辑 `src/harness/providerRegistry.ts`，把对应的 `ACTIVE_*` 常量从 `'mock'` 改为目标值：

```ts
// VLMProvider：三选一
const ACTIVE_PROVIDER = 'openai';   // 或 'qwen' | 'vllm'

// CapabilityProvider
const ACTIVE_CAPABILITY_PROVIDER = 'api';

// GovernanceProvider
const ACTIVE_GOVERNANCE_PROVIDER = 'api';

// PortalProvider
const ACTIVE_PORTAL_PROVIDER = 'api';
```

### 7.2 独立 Harness（⑤⑥）

- 教案：编辑 `src/harness/lessonPlan/index.ts`
  ```ts
  const ACTIVE = 'api';
  ```
- 课件：编辑 `src/harness/slides/index.ts`
  ```ts
  const ACTIVE = 'api';
  ```

> 🎉 **就这些。** 不需要改任何 App 组件、Store、UI 代码 —— 它们只依赖 Provider 接口。

---

## 八、安全注意事项

1. **绝不在前端硬编码 apiKey。** 生产环境必须走后端代理（方案 A）。
2. `.env.local` 仅用于本地调试，确认 `.gitignore` 包含 `.env*`：
   ```
   .env
   .env.local
   .env.*.local
   ```
3. 后端代理层应做：鉴权、限流、key 轮换、日志脱敏。
4. VLM 请求中的课堂图片可能含学生人脸，注意合规（脱敏 / 端侧处理 / 获得授权）。
5. 治理数据（`GovernanceContext.raw`）含教师绩效，属敏感数据，传输走 HTTPS，日志不记录明细。

---

## 九、端到端示例：OpenAIAdapter 完整实现

以 `VLMProvider` 的 OpenAI 兼容 Adapter 为例，展示从 Mock 切到真实 API 的完整代码。其他 LLM Adapter 同理（去掉 `image_url` 即可）。

### 9.1 实现 Adapter

替换 `src/harness/adapters/OpenAIAdapter.ts` 的内容：

```ts
import type { AnalysisChunk, AnalysisInput, VLMProvider } from '../types';
import { parseSSE, extractDeltaText, createAbortController } from './sseUtils';

/**
 * OpenAI 兼容 VLM Adapter
 * 适用于 OpenAI GPT-4o、Azure OpenAI、vLLM 本地部署等所有 OpenAI 兼容服务。
 *
 * 生产环境建议走后端代理 /api/llm/*，由后端注入 apiKey。
 */
export class OpenAIAdapter implements VLMProvider {
  readonly name = 'OpenAI Compatible VLM Adapter';

  // 开发期用环境变量；生产期 baseURL 指向后端代理
  private baseURL = import.meta.env.VITE_LLM_BASE_URL || '/api/llm';
  private apiKey = import.meta.env.VITE_LLM_API_KEY || '';  // 走代理时留空
  private model = import.meta.env.VITE_LLM_MODEL || 'gpt-4o';

  private controllers = new Map<string, AbortController>();

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    const sessionId = `${input.scenario}-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    try {
      // 1. 组装多模态 prompt
      const messages = this.buildMessages(input);

      // 2. 调用 OpenAI 兼容流式接口
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

      // 3. 解析 SSE，把 token 累积成 AnalysisChunk yield
      let textBuffer = '';
      let currentT = input.startFrom ?? 0;

      for await (const chunk of parseSSE(resp, controller.signal)) {
        const token = extractDeltaText(chunk);
        if (!token) continue;

        textBuffer += token;

        // 简化策略：遇到换行就把累积文本作为 text chunk yield
        // 进阶：可要求 LLM 输出 JSON Lines，按 type 解析为不同 chunk
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

      // flush 剩余
      if (textBuffer.trim()) {
        yield { type: 'text', content: textBuffer.trim(), timestamp: currentT };
      }
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  /** 组装多模态 messages：system + 用户消息（含帧描述/转录/可选图片） */
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
        content: `你是一位课堂观察专家。根据课堂画面描述与转录，按时间线流式产出分析。
输出要求：每行一条分析，格式为 JSON：{"type":"text|event|metric","content":"...","timestamp":N}
type 取值：text(分析文本)/event(关键事件)/metric(指标快照)。`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `场景：${input.scenario}\n\n画面帧：\n${sceneDesc}\n\n转录：\n${transcript}` },
          // 如果有真实课堂图片，可加 image_url：
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

### 9.2 创建 SSE 工具文件

按第四节创建 `src/harness/adapters/sseUtils.ts`。

### 9.3 切换注册中心

编辑 `src/harness/providerRegistry.ts`：

```ts
const ACTIVE_PROVIDER = 'openai';
```

### 9.4 配置环境变量（开发期）

新建 `.env.local`：

```bash
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_API_KEY=sk-your-key-here
VITE_LLM_MODEL=gpt-4o
```

### 9.5 验证

```bash
npm run dev
```

打开课堂分析场景，此时应看到真实 VLM 的流式输出（而非预制剧本）。

---

## 十、常见问题

### Q1：VLM 输出不是结构化的，UI 怎么渲染？

项目 UI 对 `AnalysisChunk.type` 有不同渲染分支。如果 VLM 只输出纯文本，全部 yield 成 `type: 'text'` 也能跑（走默认文本流渲染）。若要触发事件/指标/学生卡片，需在 prompt 里要求 LLM 输出 JSON Lines 并解析。第九节示例展示了基础文本流；进阶可在 `buildMessages` 的 system prompt 里约束输出格式，并在 yield 前用 `JSON.parse` 转换。

### Q2：流式输出太慢/太快，和视频时间轴对不上？

Mock Provider 用 `sleep` 按 `chunk.timestamp` 对齐时间轴。真实 Adapter 若要回放模式对齐，可在 yield 前 `await sleep((chunk.timestamp - lastT) * 1000 / speed)`。实时模式一般不需要人为延迟。

### Q3：本地 vLLM 部署怎么接？

vLLM 启动后默认暴露 OpenAI 兼容协议（`http://localhost:8000/v1`），直接用 `VLLMAdapter`（本质是 OpenAIAdapter 本地变体），把 `baseURL` 设为 `http://localhost:8000/v1`，`apiKey` 填 `'EMPTY'`，`model` 填你的模型名（如 `Qwen/Qwen2-VL-7B-Instruct`）。推荐启用 `--chat-template` 与多模态 `image_url` 适配。

### Q4：治理 Provider 的 JSON mode 怎么用？

`detectAnomalies` / `suggestResearch` 要返回结构化对象，建议用 OpenAI 的 JSON mode：

```ts
const resp = await fetch(`${baseURL}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model,
    messages: [{ role: 'system', content: '输出 AnomalyAlert[] 的 JSON...' }, ...],
    response_format: { type: 'json_object' },  // 关键
  }),
});
const data = await resp.json();
const alerts = JSON.parse(data.choices[0].message.content) as AnomalyAlert[];
```

### Q5：能不能只接一部分，其他保持 Mock？

可以。每个 Provider 独立切换。例如只想接真实治理 LLM，其他保持剧本：

```ts
const ACTIVE_PROVIDER = 'mock';              // 课堂分析仍用剧本
const ACTIVE_CAPABILITY_PROVIDER = 'mock';
const ACTIVE_GOVERNANCE_PROVIDER = 'api';    // 治理用真实 LLM
const ACTIVE_PORTAL_PROVIDER = 'mock';
```

### Q6：教案/课件 Adapter 和治理 Adapter 有什么不同？

它们是**物理隔离**的独立 Harness，注册中心不在 `providerRegistry.ts`，而在各自的 `index.ts`。类型也是各自定义的（`LessonPlanGenChunk` / `SlidesGenChunk` vs `GovernanceChunk`），互不依赖。但 LLM 调用方式完全一致，可复用第四节 的 `parseSSE` 工具。

---

<div align="center">

**🔌 接入真实 API，只需三步：实现 Adapter → 切换常量 → 配置环境变量**

</div>
