import type {
  AnalysisChunk,
  AnalysisInput,
  ScenarioScript,
  ScenarioType,
  VLMProvider,
} from './types';
import { lookupMockImage, isKnownMockImage, getMockImageLabel } from './MockImageResolver';
import classroomScript from './scripts/classroom.json';
import peScript from './scripts/pe.json';
import labScript from './scripts/lab.json';
import workshopScript from './scripts/workshop.json';
import microlessonScript from './scripts/microlesson.json';

const SCRIPTS: Record<ScenarioType, ScenarioScript> = {
  classroom: classroomScript as unknown as ScenarioScript,
  pe: peScript as unknown as ScenarioScript,
  lab: labScript as unknown as ScenarioScript,
  workshop: workshopScript as unknown as ScenarioScript,
  microlesson: microlessonScript as unknown as ScenarioScript,
};

export function getScript(scenario: ScenarioType): ScenarioScript {
  return SCRIPTS[scenario];
}

/** 主动取消会话的标记 */
const ACTIVE_SESSIONS = new Set<string>();

/**
 * Mock VLM Provider
 *
 * - 读取预制剧本 JSON（含 frames/transcript/analysis_script/students/wiki）
 * - 按时间戳增量 yield chunk，模拟真实 VLM 的 token 级流式输出
 * - 支持 realtime / playback 模式
 * - 支持 teacher / student 视角（学生视角聚焦特定 studentId，过滤学生 chunk 与 wiki）
 * - [P3] 支持预制图片识别：上传 素材/mock-*.png 时，自动注入"图片识别摘要"chunk 前缀
 */
export class MockVLMProvider implements VLMProvider {
  readonly name = 'MockVLMProvider (Scripted + Image Mock)';

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    const script = SCRIPTS[input.scenario];
    if (!script) {
      console.error('Script not found', { scenario: input.scenario });
      throw new Error(`Script not found for scenario: ${input.scenario}`);
    }

    const sessionId = `${input.scenario}-${Date.now()}`;
    ACTIVE_SESSIONS.add(sessionId);

    const speed = input.speed && input.speed > 0 ? input.speed : 1;
    const startFrom = input.startFrom ?? 0;

    // —— P3：检查是否有已知 mock 图片，有则先产出"图片识别摘要"前缀 ——
    const imageFrame = input.frames.find((f) => f.imageData);
    if (imageFrame) {
      const lookup = lookupMockImage(imageFrame.imageFileSize, imageFrame.imageData);
      if (lookup.known) {
        // 先产出一条说明 chunk（标注是 Mock 识别）
        yield {
          type: 'text',
          content: `[Mock 图片识别] ${lookup.label}`,
          timestamp: 1,
          confidence: 0,
          label: 'Mock 图片识别',
        };
        // 逐条产出预制识别摘要 chunk
        for (const rc of lookup.chunks) {
          if (!ACTIVE_SESSIONS.has(sessionId)) return;
          await sleep(150);
          yield { ...rc, timestamp: rc.timestamp + startFrom };
        }
        // 图片识别摘要与后续文本分析之间稍作停顿
        await sleep(400);
        yield {
          type: 'text',
          content: '（以下为文本快照分析，未对图片内容逐像素识别）',
          timestamp: startFrom + 25,
          confidence: 0,
          label: 'Mock 图片识别',
        };
        await sleep(200);
      } else if (lookup.chunks.length > 0) {
        // 未知图片但有降级提示
        for (const rc of lookup.chunks) {
          if (!ACTIVE_SESSIONS.has(sessionId)) return;
          await sleep(150);
          yield { ...rc, timestamp: rc.timestamp + startFrom };
        }
        await sleep(300);
      }
    }

    // 过滤剧本：仅保留 >= startFrom 的 chunks
    const filtered = script.analysisScript.filter((c) => c.timestamp >= startFrom);
    // 排序确保时间序
    filtered.sort((a, b) => a.timestamp - b.timestamp);

    // 学生视角：聚焦单个学生，过滤其他学生 chunk，保留 wiki 与教师视角分析
    const viewFiltered = input.role === 'student' && input.studentId
      ? filtered.filter(
          (c) =>
            c.type !== 'student' ||
            c.studentId === input.studentId ||
            c.studentId === undefined
        )
      : filtered;

    let lastT = startFrom;
    for (const chunk of viewFiltered) {
      if (!ACTIVE_SESSIONS.has(sessionId)) {
        // 已取消
        return;
      }

      // 按 chunk 之间时间差 sleep（实时模式按真实秒数；回放按倍速）
      const dt = chunk.timestamp - lastT;
      if (dt > 0) {
        const ms = input.mode === 'realtime' ? dt * 1000 / speed : dt * 1000 / speed;
        // 限制最大单次 sleep，避免 UI 阻塞过久
        await sleep(Math.min(ms, 2000));
      }
      lastT = chunk.timestamp;

      // 文本 chunk 增量切片（打字机效果由 UI 实现，这里整段输出）
      yield chunk;
    }

    ACTIVE_SESSIONS.delete(sessionId);
  }

  cancel(sessionId: string): void {
    ACTIVE_SESSIONS.add(sessionId); // 标记位
    setTimeout(() => ACTIVE_SESSIONS.delete(sessionId), 0);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
