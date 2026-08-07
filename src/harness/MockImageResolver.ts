/**
 * Mock 图片识别解析器
 *
 * P3 多模态演示引擎：当用户上传 素材/ 中预置的 5 张拟真课堂图片时，
 * MockVLMProvider 自动识别并产出含"图片识别摘要"的特殊 AnalysisChunk 前缀，
 * 模拟真实 VLM 看图说话的体验，同时诚实标注 confidence: 0 + Mock 提示。
 *
 * 匹配方式：文件大小（bytes）+ PNG 头部校验（base64 固定前缀 iVBOR），
 * 双重确认避免误触发。
 *
 * 未知图片 → 走现有文本快照路径，不报错不卡死（见 MockVLMProvider）。
 */

import type { AnalysisChunk, ScenarioType } from './types';

/** mock-*.png 文件在磁盘上的原始字节数 */
export const KNOWN_MOCK_FILE_SIZES: ReadonlySet<number> = new Set([
  1790814, // mock-classroom-physics.png  —— 牛顿第二定律物理课
  1968611, // mock-pe-basketball.png      —— 篮球运球体育课
  1681250, // mock-lab-titration.png      —— 酸碱中和滴定实验课
  1876394, // mock-workshop-lathe.png     —— 普通车削实操课
  1720053, // mock-microlesson-math.png   —— 函数单调性微课
]);

/** 图片文件大小 → 场景映射 */
const SIZE_TO_SCENARIO: Record<number, ScenarioType> = {
  1790814: 'classroom',
  1968611: 'pe',
  1681250: 'lab',
  1876394: 'workshop',
  1720053: 'microlesson',
};

/** 图片文件大小 → 场景标题（中文，UI 展示用） */
const SIZE_TO_LABEL: Record<number, string> = {
  1790814: '物理课 — 牛顿第二定律',
  1968611: '体育课 — 篮球运球',
  1681250: '实验课 — 酸碱中和滴定',
  1876394: '实操课 — 普通车削',
  1720053: '微课 — 函数单调性',
};

/** 图片文件大小 → 模拟 VLM "看图识别" 产出的 chunk 前缀（按场景预设内容） */
const SIZE_TO_RECOGNITION_CHUNKS: Record<number, AnalysisChunk[]> = {
  1790814: [
    {
      type: 'metric',
      content: '上课场景：物理教室，黑板书写"牛顿第二定律 F=ma"及受力分析图',
      timestamp: 10,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'event',
      content: '教师正面向黑板书写公式，25名学生就座，前排约5人举手准备回答问题',
      timestamp: 15,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'metric',
      content: '抬头率约0.88，学生参与度较高，课堂氛围活跃',
      timestamp: 20,
      confidence: 0,
      label: 'Mock 图片识别',
    },
  ],
  1968611: [
    {
      type: 'metric',
      content: '体育课场景：室外篮球场，蓝天绿树，约20名学生穿蓝白运动服',
      timestamp: 10,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'event',
      content: '教师示范运球动作，学生两人一组在底线练习运球',
      timestamp: 15,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'metric',
      content: '学生动作参与率约0.92，分组练习秩序良好',
      timestamp: 20,
      confidence: 0,
      label: 'Mock 图片识别',
    },
  ],
  1681250: [
    {
      type: 'metric',
      content: '实验课场景：化学实验室，6个实验台各2名学生，穿白大褂戴护目镜',
      timestamp: 10,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'event',
      content: '教师俯身指导一组滴定操作，学生注视滴定管刻度读数',
      timestamp: 15,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'metric',
      content: '全员佩戴护目镜，实验台整洁规范，安全合规',
      timestamp: 20,
      confidence: 0,
      label: 'Mock 图片识别',
    },
  ],
  1876394: [
    {
      type: 'metric',
      content: '实操课场景：金工车间，8台车床分两排，混凝土地面，安全标语上墙',
      timestamp: 10,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'event',
      content: '教师穿蓝色工装演示刀具调整，4名学生围观注视切削点',
      timestamp: 15,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'metric',
      content: '学生佩戴护目镜和工装，机床运行状态正常，车间照明充足',
      timestamp: 20,
      confidence: 0,
      label: 'Mock 图片识别',
    },
  ],
  1720053: [
    {
      type: 'metric',
      content: '微课场景：数学教室，交互式白板显示"函数的单调性"坐标图及上升曲线',
      timestamp: 10,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'event',
      content: '教师衬衫激光笔指向白板曲线，三脚架摄像机正在录制微课',
      timestamp: 15,
      confidence: 0,
      label: 'Mock 图片识别',
    },
    {
      type: 'metric',
      content: '20名学生就座，部分做笔记，教室配备投影仪和现代化设备',
      timestamp: 20,
      confidence: 0,
      label: 'Mock 图片识别',
    },
  ],
};

/** 图片匹配失败时的通用降级 chunk（未知图片统一走此提示） */
const UNKNOWN_IMAGE_CHUNKS: AnalysisChunk[] = [
  {
    type: 'text',
    content: '（Mock 模式：已收到课堂截图，但图片不在预置素材库中。按文本快照路径继续分析，未实际识别图片内容。上传 素材/mock-*.png 可体验预制图片识别演示）',
    timestamp: 5,
    confidence: 0,
    label: 'Mock 未识别',
  },
];

/** PNG base64 固定前缀（用于校验是否为 PNG 图片） */
const PNG_BASE64_PREFIX = 'iVBOR';

export interface ImageLookupResult {
  /** 匹配到的场景类型（用于 UI 提示 + 跳转建议） */
  scenario: ScenarioType;
  /** 场景中文标签（UI 展示） */
  label: string;
  /** 模拟 VLM 识别的 chunk 前缀列表 */
  chunks: AnalysisChunk[];
  /** 是否为已知 mock 图片 */
  known: boolean;
}

/**
 * 根据传入的文件大小与 base64 数据，查找是否匹配 素材/ 中的预置 mock 图片。
 *
 * 双重校验：
 * 1. fileSize 命中 KNOWN_MOCK_FILE_SIZES
 * 2. base64 以 "iVBOR" 开头（PNG 标准头部）
 *
 * 仅文件大小命中但非 PNG → 认为误匹配，返回 unknown（避免用户随意传文件误触发）
 *
 * @param fileSize  浏览器 File 对象的 .size 属性（原始字节数）
 * @param imageBase64  FileReader.readAsDataURL 返回的 data:image/...;base64,... 完整串
 * @returns 匹配结果（known=true + 预制 chunks），或未知图片降级结果（known=false）
 */
export function lookupMockImage(
  fileSize: number | undefined,
  imageBase64: string | undefined,
): ImageLookupResult {
  // 无图片数据 → 直接返回未知
  if (!fileSize || !imageBase64) {
    return { scenario: 'classroom' as ScenarioType, label: '', chunks: [], known: false };
  }

  // 大小命中 + base64 含 PNG 头部 → 确认为已知 mock 图片
  if (
    KNOWN_MOCK_FILE_SIZES.has(fileSize) &&
    imageBase64.includes(PNG_BASE64_PREFIX)
  ) {
    const scenario = SIZE_TO_SCENARIO[fileSize] ?? 'classroom';
    return {
      scenario: scenario as ScenarioType,
      label: SIZE_TO_LABEL[fileSize] ?? `场景：${scenario}`,
      chunks: SIZE_TO_RECOGNITION_CHUNKS[fileSize] ?? [],
      known: true,
    };
  }

  // 文件大小命中但 base64 头不对 → 误匹配，降级
  if (KNOWN_MOCK_FILE_SIZES.has(fileSize)) {
    return {
      scenario: 'classroom' as ScenarioType,
      label: '',
      chunks: UNKNOWN_IMAGE_CHUNKS,
      known: false,
    };
  }

  // 完全未知图片 → 透明降级（不加额外 chunk，走纯文本快照路径）
  return {
    scenario: 'classroom' as ScenarioType,
    label: '',
    // 注意：未知图片在 Mock 模式下不加额外提示 chunk，直接走文本快照路径
    // 但为了让演示者知道 P3 功能已启用，可加一条反馈
    chunks: UNKNOWN_IMAGE_CHUNKS,
    known: false,
  };
}

/**
 * 判断某个文件大小是否属于预置 mock 图片。
 * 用于 UI 实时反馈（上传图片后立刻显示匹配信息，无需等分析开始）。
 */
export function isKnownMockImage(fileSize: number | null | undefined): boolean {
  return fileSize != null && KNOWN_MOCK_FILE_SIZES.has(fileSize);
}

/**
 * 根据文件大小获取场景标签（UI 提示用）。
 * 未知图片返回 null。
 */
export function getMockImageLabel(fileSize: number | null | undefined): string | null {
  if (fileSize == null || !KNOWN_MOCK_FILE_SIZES.has(fileSize)) return null;
  return SIZE_TO_LABEL[fileSize] ?? null;
}
