import type { SlidesChatInput, SlidesDraftInput, SlideDesign } from './types';

/**
 * 课件演示脚本 — 3 套 design 共用通用模板（含标题/列表/表格/引用/代码）
 * 模板聚焦"函数单调性"课题，与 microlesson 场景对齐
 * design 差异在渲染层（designs/）体现，模板内容统一
 */

export function buildSlidesContent(input: SlidesDraftInput): string[] {
  const topic = input.topic || '函数单调性判定';
  const subject = input.subject || '数学';
  return [
    `# ${topic}\n\n${subject} · 高三微课`,
    '## 学习目标\n\n1. 理解单调性定义\n2. 掌握导数判定法\n3. 求解单调区间',
    '## 单调性定义\n\n> 函数在区间内随自变量增大而函数值增大（递增）或减小（递减）。\n\n**严格定义**：对任意 x₁<x₂∈I，若 f(x₁)<f(x₂) 则递增。',
    "## 导数判定法\n\n若 f(x) 在区间内可导：\n\n- f'(x)>0 → **递增**\n- f'(x)<0 → **递减**\n- 驻点 f'(x)=0 需单独分析",
    "## 例题：f(x)=x²-2x+3\n\n1. 求导：f'(x)=2x-2\n2. 令 f'(x)=0：x=1\n3. 划分区间 (-∞,1) 与 (1,+∞)",
    "## 单调区间\n\n| 区间 | f'(x) 符号 | 单调性 |\n|------|-----------|--------|\n| (-∞,1) | - | 递减 |\n| (1,+∞) | + | 递增 |",
    '## 课堂练习\n\n判断 f(x)=ln(x) 的单调性。\n\n> 思考 30 秒，求 (ln x)\' 的符号',
    '## 课堂小结\n\n- 单调性定义\n- 导数判定法\n- 区间划分四步：求导→驻点→分区→判号',
    '## 作业\n\n1. P82 第 1-3 题\n2. 拓展：判断 f(x)=x³ 的单调性\n\n下节课：函数极值与最值',
  ];
}

export function matchSlidesChat(input: SlidesChatInput): string {
  const q = input.query.toLowerCase();
  if (/(加|增加|多少|几张|页数)/.test(q)) {
    return '建议在"例题"后增加 1 张"常见错误"页（展示学生易混淆的驻点判号错误），并在"小结"前增加 1 张"知识结构图"页串联本节与上节内容。';
  }
  if (/(动画|动态|图|演示)/.test(q)) {
    return '可在"单调区间"页插入 GeoGebra 动态曲线，或用静态区间数轴 + 箭头标注递增/递减段。建议保持一图一概念，避免信息过载。';
  }
  if (/(练习|互动|提问|碎片)/.test(q)) {
    return '建议在"课堂练习"页用分步显示：先显示题目，按空格分步显示提示1（求导）、提示2（判号）、答案。提升互动节奏。';
  }
  if (/(配色|样式|主题|风格|design|设计)/.test(q)) {
    return '当前 3 套 design：经典板书（衬线/纸张/下划线，适合人文）、现代极简（无衬线/色块/卡片，适合通用）、图表驱动（双栏/编号/进度条，适合理科数据）。建议数学课件用图表驱动，语文用经典板书。';
  }
  if (/(备注|演讲者|讲稿)/.test(q)) {
    return '建议为每张幻灯片添加演讲者备注：演示时按 S 键打开演讲者视图查看。备注应包含：本页要点、过渡话术、时间提示。';
  }
  if (/(表格|数据|对比)/.test(q)) {
    return '涉及数据对比的页面建议用表格呈现（如单调区间表）。图表驱动 design 会突出表格样式（斑马纹/粗边框）。';
  }
  return '已基于当前课件内容生成微调建议。你可以追问：幻灯片数量够吗？怎样加动画？练习如何互动？3 套 design 怎么选？演讲者备注怎么写？表格怎么用？';
}

/** 根据 design 返回推荐侧重（仅作对话提示用，模板内容统一） */
export function designHint(design: SlideDesign): string {
  switch (design) {
    case 'classic':
      return '经典板书：衬线字体 + 纸张底色，适合文科/需要书卷气的场景';
    case 'modern':
      return '现代极简：无衬线 + 色块标题，适合通用汇报/公开课';
    case 'dataviz':
      return '图表驱动：双栏 + 进度条 + 表格突出，适合理科/数据密集型课件';
  }
}
