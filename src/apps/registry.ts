export type AppRole = 'teacher' | 'student' | 'both';
export type AppCategory = 'scenario' | 'report' | 'profile' | 'wiki' | 'system';

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
  { id: 'notes', name: '我的笔记', icon: '📝', role: 'student', category: 'system', description: '课堂笔记与重点收藏', width: 600, height: 480 },
  // 系统
  { id: 'about', name: '关于', icon: '💡', role: 'both', category: 'system', description: '关于本系统', width: 480, height: 360 },
];

export function appsForRole(role: AppRole): AppMeta[] {
  return APP_REGISTRY.filter((a) => a.role === 'both' || a.role === role);
}

export function findApp(id: string): AppMeta | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
