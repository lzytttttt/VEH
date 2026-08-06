export type AppRole = 'teacher' | 'student' | 'admin' | 'both';
export type AppCategory = 'scenario' | 'report' | 'profile' | 'wiki' | 'capability' | 'governance' | 'system' | 'teaching';

export interface AppMeta {
  id: string;
  name: string;
  icon: string; // emoji 占位
  role: AppRole;
  category: AppCategory;
  description: string;
  width: number;
  height: number;
}

export const APP_REGISTRY: AppMeta[] = [
  // 场景应用
  { id: 'classroom', name: '普通教室', icon: '🏫', role: 'both', category: 'scenario', description: '板书识别 / 师生问答 / 抬头率 / 走神检测', width: 960, height: 640 },
  { id: 'pe', name: '体育课', icon: '⚽', role: 'both', category: 'scenario', description: '动作姿态 / 运动强度热力图 / 参与度', width: 960, height: 640 },
  { id: 'lab', name: '实验室', icon: '🔬', role: 'both', category: 'scenario', description: '操作步骤合规 / 安全事件 / 器材使用', width: 960, height: 640 },
  { id: 'workshop', name: '实训车间', icon: '🏭', role: 'both', category: 'scenario', description: '工艺步骤 / 设备操作 / 错误纠正', width: 960, height: 640 },
  { id: 'microlesson', name: '微课录制', icon: '🎥', role: 'both', category: 'scenario', description: 'PPT 内容同步 / 讲解节奏 / 屏幕焦点', width: 960, height: 640 },
  // 报告与档案
  { id: 'report', name: '分析报告', icon: '📋', role: 'both', category: 'report', description: '按 session 汇总指标与改进建议', width: 720, height: 560 },
  { id: 'profile', name: '画像档案', icon: '👤', role: 'both', category: 'profile', description: '教师画像 / 学生学情长期档案', width: 800, height: 600 },
  // 知识模块
  { id: 'wiki', name: '知识 WIKI', icon: '📖', role: 'both', category: 'wiki', description: 'LLM 知识图谱 + AI 学习助手', width: 900, height: 640 },
  // 能力提升
  { id: 'teacher-drill', name: '教师演练', icon: '🎓', role: 'teacher', category: 'capability', description: 'Three.js 虚拟学生模拟演练', width: 980, height: 660 },
  { id: 'learning-game', name: '学生闯关', icon: '🎮', role: 'student', category: 'capability', description: '课堂内容互动游戏（限时问答/多选/连线）', width: 760, height: 560 },
  // 教学工具（教师角色）
  { id: 'lesson-plan', name: '教案工具', icon: '📄', role: 'teacher', category: 'teaching', description: 'MD 富文本教案编辑器 + 生成助手 Agent', width: 1080, height: 660 },
  { id: 'slides', name: '课件工具', icon: '🎬', role: 'teacher', category: 'teaching', description: 'HTML Deck 课件 + reveal.js 演示 + 生成助手', width: 1080, height: 660 },
  { id: 'notes', name: '我的笔记', icon: '📝', role: 'student', category: 'system', description: '课堂笔记与重点收藏', width: 600, height: 480 },
  // 学校治理（管理岗位）
  { id: 'dashboard', name: '校长驾驶舱', icon: '📊', role: 'admin', category: 'governance', description: 'AI Agent 治理简报 · 全校概览 · 学期趋势', width: 1040, height: 680 },
  { id: 'admin-console', name: '教务管理台', icon: '🗂️', role: 'admin', category: 'governance', description: '教师/班级管理 · 系统集成 · SSO配置', width: 980, height: 640 },
  { id: 'grade-analysis', name: '年级分析台', icon: '📈', role: 'admin', category: 'governance', description: '班级对比 · 学科组分析 · 群体分布', width: 940, height: 620 },
  // 系统
  { id: 'portal', name: '管理门户', icon: '🚪', role: 'both', category: 'system', description: '角色管理门户 · AI Agent 检索导航', width: 880, height: 580 },
  { id: 'about', name: '关于', icon: '💡', role: 'both', category: 'system', description: '关于本系统', width: 480, height: 360 },
];

export function appsForRole(role: AppRole): AppMeta[] {
  return APP_REGISTRY.filter((a) => a.role === 'both' || a.role === role);
}

export function findApp(id: string): AppMeta | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
