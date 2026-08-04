<div align="center">

# 🏫 VLM 课堂分析系统

### Windows 95 Nostalgia OS Edition · v0.1.0 (Build 1995)

**用一颗视觉大模型，替代 ASR → CV → NLP → Rules 的整条录播管线。**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-CC_BY--NC_4.0-EF9421?logo=creative-commons&logoColor=white)](#-许可证)

</div>

---

## 🕹️ 这是一个什么样的项目？

把时间拨回 1995 年 —— 蓝盈盈的"开始"按钮、凹凸的 3D 窗口边框、能拖来拖去的图标。今天，我们把这套经典的 Win95 桌面操作系统外壳，**重新塞进了一个面向未来的内核**：

> **VLM（Vision-Language Model，视觉语言大模型）驱动的智能课堂分析平台。**

传统课堂录播分析往往是这样的"流水线工厂"：

```
音视频输入 → ASR 语音转写 → CV 计算机视觉 → NLP 自然语言处理 → 规则引擎 → 报告
```

每换一个模型就要重新对齐接口，每加一个场景就要写一套规则。**本项目用单颗 VLM 把这条流水线整体替换** —— 你只需要给它"看"一段课堂画面，它就能告诉你：

- 老师讲了什么、写到板书的哪一行
- 谁抬着头、谁在走神
- 实验室里谁违规操作了器材
- 学生此刻的参与度、注意力、教学质量

它不是真的在云端跑大模型 —— 项目内置了一套**预制剧本 + 增量流式 Mock Provider**，让前端体验与真实 VLM 几乎一致；等你接入真实接口时，只需替换 Adapter，无需改动任何业务代码。

---

## ✨ 核心特性

| 模块 | 说明 |
| --- | --- |
| 🏫 **5 大场景演示** | 普通教室 / 体育课 / 实验室 / 实训车间 / 微课录制 |
| 🧠 **解耦的 VLM Harness** | Mock 预制剧本 + 增量流式 + Adapter 预留，可平滑切换真实 VLM |
| 👨‍🏫👩‍🎓 **双角色登录** | 教师 / 学生各自独立的界面与权限 |
| 🎯 **双视角观察** | 教师看"我的学生"，学生看"我的视角" |
| ⏯️ **实时 + 回放双模式** | 边录边分析 / 录后自由拖动时间线 |
| 📋 **分析报告** | 自动汇总指标、改进建议、可打印、可导出 |
| 👤 **画像档案** | 教师多维能力评估雷达图 + 长期趋势 |
| 📖 **知识 WIKI** | 自动从课堂抽取知识图谱，附 AI 学习助手 |
| 📝 **我的笔记** | 学生可随手记录课堂重点、收藏知识节点 |

---

## 🖼️ 项目截图

> 所有截图均来自项目实际运行界面，复古的像素感与现代化能力并存 ✨
> 👆 **点击任一截图可查看高清原图**。

---

### 🔬 实验室实时分析 · 显微镜下的酸碱中和滴定

画面左侧是模拟的实验室视频流，右侧是 VLM 正在"识别"出的分析轴 —— 安全准备、操作讲解、操作专注度、知识点命中、学生个体参与度 —— 像不像一个真正的 AI 助教坐在后排听课？

时间线支持 0.5x / 1x / 2x / 4x 倍速回放，每一个事件都标在轴上，鼠标拖一拖就能跳转到任意时刻。

<div align="center">
  <a href="素材/ScreenShot_2026-08-04_102953_447.png" target="_blank">
    <img src="素材/ScreenShot_2026-08-04_102953_447.png" width="72%" alt="实验室实时分析" />
  </a>
  <br/>
  <sub>🔬 图 1 · 实验室场景的实时分析主界面</sub>
</div>

---

### 👤 教师画像档案 · 高中物理高级教师 李建国

多维能力雷达图 + 近 5 节课趋势线，一目了然：

- ✅ **优势维度**：规范性 93% · 教学质量 89%（稳定优秀，可作为示范标杆）
- ⚠️ **短板维度**：互动性 79% · 创新性 77%（建议参加相关教研活动或线上培训）

<div align="center">
  <a href="素材/ScreenShot_2026-08-04_103106_684.png" target="_blank">
    <img src="素材/ScreenShot_2026-08-04_103106_684.png" width="72%" alt="教师画像档案" />
  </a>
  <br/>
  <sub>👤 图 2 · 教师画像档案 · 雷达图 + 趋势线</sub>
</div>

---

### 📋 分析报告 · 高一物理·牛顿第二定律

5 维评分卡 + 教学效果分析 + 学生个体建议（张明、王芳、李伟、赵静……），一键打印、导出归档 —— 教研组评课、青年教师磨课的神器。

<div align="center">
  <a href="素材/wechat_2026-08-04_103048_875.png" target="_blank">
    <img src="素材/wechat_2026-08-04_103048_875.png" width="62%" alt="分析报告" />
  </a>
  <br/>
  <sub>📋 图 3 · 单节课分析报告 · 5 维评分 + 学生建议</sub>
</div>

---

### 📖 知识 WIKI + AI 学习助手

课堂一结束，VLM 自动抽取出"牛顿第一定律（惯性定律）"的知识节点，包含摘要、详细内容、课堂引用片段、关联知识点、知识图谱。右侧的 AI 学习助手还能基于上下文回答学生的追问：

> 学生：加速度的方向跟谁相同？
> AI：加速度方向与合外力方向相同，而不是与速度方向相同……

<div align="center">
  <a href="素材/wechat_2026-08-04_103136_163.png" target="_blank">
    <img src="素材/wechat_2026-08-04_103136_163.png" width="72%" alt="知识 WIKI + AI 学习助手" />
  </a>
  <br/>
  <sub>📖 图 4 · 知识 WIKI 节点详情 + AI 学习助手</sub>
</div>

---

### 📝 我的笔记 & 💡 关于本系统

学生可以把课堂重点钉在"置顶"位置，老师可以翻阅系统说明 —— 一切都装在这台像素风"电脑"里。

<table align="center">
  <tr>
    <td align="center" width="50%">
      <a href="素材/ScreenShot_2026-08-04_103334_609.png" target="_blank">
        <img src="素材/ScreenShot_2026-08-04_103334_609.png" width="92%" alt="我的笔记" />
      </a>
      <br/>
      <sub>📝 图 5 · 我的笔记</sub>
    </td>
    <td align="center" width="50%">
      <a href="素材/ScreenShot_2026-08-04_103155_452.png" target="_blank">
        <img src="素材/ScreenShot_2026-08-04_103155_452.png" width="92%" alt="关于本系统" />
      </a>
      <br/>
      <sub>💡 图 6 · 关于本系统</sub>
    </td>
  </tr>
</table>

---

## 🏗️ 架构

```
┌──────────────────────────────────────────────────────────┐
│  Shell 层（Win95 拟态桌面）                                │
│  BootScreen · LoginDialog · Desktop · Window · Taskbar    │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│  Apps 层（场景 / 报告 / 档案 / WIKI）                       │
│  classroom · pe · lab · workshop · microlesson            │
│  report · profile · wiki · notes · about                  │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│  Harness 层（VLM 编排）                                    │
│  VLMProvider 接口 · MockProvider · 真实 Adapter 预留       │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│  Data 层（LocalStorage 持久化）                             │
└──────────────────────────────────────────────────────────┘
```

**关键设计理念**：Harness 层与 Apps 层完全解耦。`VLMProvider` 是统一接口，今天用 `MockVLMProvider` 跑预制剧本，明天换成 `QwenVLMProvider` 调真实接口 —— **业务代码一行不改**。

---

## 🚀 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
# → 浏览器打开 http://localhost:5173

# 3. 构建生产版本
npm run build

# 4. 预览构建产物
npm run preview
```

进入系统后会依次看到：

1. 🖥️ **BootScreen** —— 蓝白渐变的开机引导
2. 🔐 **LoginDialog** —— 选择"教师登录"或"学生登录"
3. 🪟 **Desktop** —— 桌面图标 + 开始菜单 + 任务栏
4. 🎯 双击图标打开任意 App 窗口

---

## 🧩 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript 5 |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3 + 自研 Win95 组件样式（`.win-text` / `.win-sunken` / `.win-fieldset`） |
| 状态 | Zustand（auth / session / profile / wiki / window 多 Store 分治） |
| 图标 | lucide-react + react-icons |
| 图表 | recharts（雷达图 / 折线图） |
| 持久化 | 浏览器 LocalStorage（开箱即用、无需后端） |

---

## 🗂️ 目录结构

```
src/
├── shell/           # Win95 拟态：桌面、窗口、任务栏、登录、开机
├── apps/            # 业务应用
│   ├── scenarios/   # 五大场景：classroom/pe/lab/workshop/microlesson
│   ├── ReportApp.tsx
│   ├── ProfileApp.tsx
│   ├── WikiApp.tsx
│   ├── NotesApp.tsx
│   └── AboutApp.tsx
├── components/      # 复用组件：Timeline · RadarChart · TrendChart · TypingStream · ChatAssistant ...
├── harness/         # VLM 编排：VLMProvider 接口 + MockProvider + Adapter 预留
├── stores/          # Zustand 状态管理
├── data/            # 种子数据 + LocalStorage 持久化
├── theme/           # Win95 主题样式
├── App.tsx
└── main.tsx
```

---

## 📜 许可证

本项目采用 **[Creative Commons 署名-非商业性使用 4.0 国际 (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/deed.zh)** 协议发布。

你可以自由地：

- ✅ **分享** — 复制、发行、传播本作品
- ✅ **改编** — 修改、转换、二次创作

但必须遵守以下条款：

- 📛 **署名** — 你必须给出适当的署名，提供指向本项目主页与原作者的链接，同时标明是否做了修改
- 🚫 **禁止商用** — 你不得将本作品用于任何商业目的（包括但不限于：销售、付费服务、商业培训、商业产品集成、广告变现等）

> 简言之：**想转载、二创、教学使用？欢迎，但请署上原作者与项目地址；想拿去做生意？没门。**

完整法律文本请参见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- 致敬 **Microsoft Windows 95** —— 一个定义了"个人电脑桌面"的伟大产品
- 致敬所有开源的 **VLM / Qwen-VL / GPT-4V** —— 让"让 AI 看懂世界"成为可能
- 致敬像素艺术、致敬复古 UI、致敬所有让软件重新变得有趣的人

---

<div align="center">

**Made with ❤️ and a floppy disk · © 1995-2026 VLM Systems Inc.**

*本仓库为演示项目，所有学生/教师姓名、课堂数据均为虚构。*

</div>