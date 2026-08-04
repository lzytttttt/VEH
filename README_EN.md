<div align="center">

# 🏫 VLM Classroom Analysis System

### Windows 95 Nostalgia OS Edition · v0.1.0 (Build 1995)

**One Vision-Language Model to replace the entire ASR → CV → NLP → Rules lecture-recording pipeline.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-CC_BY--NC_4.0-EF9421?logo=creative-commons&logoColor=white)](#-license)

[中文文档](README.md) · **English**

</div>

---

## 🕹️ What Is This Project?

Let's roll the clock back to 1995 — the teal "Start" button, the chunky 3D window borders, draggable icons everywhere. Today, we've stuffed a **future-proof brain** into that classic Win95 desktop shell:

> **A classroom-analysis platform powered by VLM (Vision-Language Models).**

A traditional lecture-recording pipeline usually looks like this:

```
audio + video → ASR speech-to-text → CV computer vision → NLP → rules engine → report
```

Every time you swap a model you re-align interfaces. Every new scenario you re-write rules. **This project replaces the entire pipeline with a single VLM** — just let it "watch" the classroom, and it will tell you:

- What the teacher said, which line of the board they wrote on
- Who's paying attention, who's zoning out
- Who mishandled equipment in the lab
- Each student's current engagement, attention, and teaching-quality scores

It isn't actually running a giant model in the cloud — the project ships a **pre-scripted Mock Provider with incremental streaming** so the front-end feels just like a real VLM. When you're ready to wire up a real backend, you only swap the Adapter; **no business code needs to change**.

---

## ✨ Core Features

| Module | Description |
| --- | --- |
| 🏫 **5 Scenario Demos** | Regular Classroom / PE Class / Chemistry Lab / Vocational Workshop / Micro-lesson Recording |
| 🧠 **Decoupled VLM Harness** | Mock scripts + incremental streaming + Adapter slot — seamlessly switch to a real VLM |
| 👨‍🏫👩‍🎓 **Dual-Role Login** | Separate interfaces and permissions for teachers and students |
| 🎯 **Two Observational Views** | Teachers see "my students"; students see "my own view" |
| ⏯️ **Live + Replay Modes** | Analyze in real time, or scrub the timeline afterwards at any speed |
| 📋 **Analysis Reports** | Auto-aggregated metrics, improvement suggestions, printable & exportable |
| 👤 **Profile Archives** | Multi-dimensional teacher radar charts + long-term trend lines |
| 📖 **Knowledge WIKI** | Auto-extracted knowledge graph from each class, with an AI study assistant |
| 📝 **My Notes** | Students can jot down highlights and pin knowledge nodes |

---

## 🖼️ Screenshots

> All screenshots are real captures from the running app — pixel-art nostalgia meets modern AI capability ✨
> 👆 **Click any screenshot to view the full-resolution original.**

---

### 🔬 Lab Live Analysis · Acid-Base Titration Under the Microscope

On the left is the simulated lab video feed; on the right is the VLM's "perception" axis — safety prep, instruction delivery, operation focus, knowledge-node hits, per-student engagement. Looks just like a real AI teaching assistant sitting in the back row.

The timeline supports 0.5x / 1x / 2x / 4x playback, with every event pinned to the axis. Drag the cursor to jump anywhere.

<div align="center">
  <a href="素材/ScreenShot_2026-08-04_102953_447.png" target="_blank">
    <img src="素材/ScreenShot_2026-08-04_102953_447.png" width="72%" alt="Lab Live Analysis" />
  </a>
  <br/>
  <sub>🔬 Fig. 1 · Lab scenario real-time analysis main view</sub>
</div>

---

### 👤 Teacher Profile · Mr. Jianguo Li, Senior Physics Teacher

A glance tells the whole story: multi-dimensional radar + 5-class trend line.

- ✅ **Strengths**: Standardization 93% · Teaching Quality 89% (stable excellence, demo-worthy)
- ⚠️ **Areas to grow**: Interactivity 79% · Innovation 77% (suggest joining teaching-research groups or online training)

<div align="center">
  <a href="素材/ScreenShot_2026-08-04_103106_684.png" target="_blank">
    <img src="素材/ScreenShot_2026-08-04_103106_684.png" width="72%" alt="Teacher Profile" />
  </a>
  <br/>
  <sub>👤 Fig. 2 · Teacher profile · radar chart + trend line</sub>
</div>

---

### 📋 Analysis Report · Grade-10 Physics · Newton's Second Law

A 5-dimension scorecard + teaching-effectiveness summary + per-student suggestions (Zhang Ming, Wang Fang, Li Wei, Zhao Jing…). One-click print and archive — a perfect companion for lesson-study groups and young teachers.

<div align="center">
  <a href="素材/wechat_2026-08-04_103048_875.png" target="_blank">
    <img src="素材/wechat_2026-08-04_103048_875.png" width="62%" alt="Analysis Report" />
  </a>
  <br/>
  <sub>📋 Fig. 3 · Single-class report · 5-dim scores + student suggestions</sub>
</div>

---

### 📖 Knowledge WIKI + AI Study Assistant

As soon as the class ends, the VLM auto-extracts the knowledge node "Newton's First Law (Law of Inertia)" — abstract, detailed content, classroom citations, related nodes, and a knowledge graph. The AI assistant on the right can answer follow-up questions using that exact context:

> Student: Which direction does acceleration match?
> AI: Acceleration points in the same direction as the net force, not the velocity direction …

<div align="center">
  <a href="素材/wechat_2026-08-04_103136_163.png" target="_blank">
    <img src="素材/wechat_2026-08-04_103136_163.png" width="72%" alt="Knowledge WIKI + AI Study Assistant" />
  </a>
  <br/>
  <sub>📖 Fig. 4 · Knowledge WIKI node detail + AI study assistant</sub>
</div>

---

### 📝 My Notes & 💡 About

Students can pin highlights to the top; teachers can browse the system info — all living inside this pixel-art "computer".

<table align="center">
  <tr>
    <td align="center" width="50%">
      <a href="素材/ScreenShot_2026-08-04_103334_609.png" target="_blank">
        <img src="素材/ScreenShot_2026-08-04_103334_609.png" width="92%" alt="My Notes" />
      </a>
      <br/>
      <sub>📝 Fig. 5 · My Notes</sub>
    </td>
    <td align="center" width="50%">
      <a href="素材/ScreenShot_2026-08-04_103155_452.png" target="_blank">
        <img src="素材/ScreenShot_2026-08-04_103155_452.png" width="92%" alt="About" />
      </a>
      <br/>
      <sub>💡 Fig. 6 · About</sub>
    </td>
  </tr>
</table>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Shell layer (Win95-style desktop)                       │
│  BootScreen · LoginDialog · Desktop · Window · Taskbar   │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│  Apps layer (scenarios / reports / profiles / WIKI)      │
│  classroom · pe · lab · workshop · microlesson            │
│  report · profile · wiki · notes · about                  │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│  Harness layer (VLM orchestration)                       │
│  VLMProvider interface · MockProvider · real Adapter     │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│  Data layer (LocalStorage persistence)                   │
└──────────────────────────────────────────────────────────┘
```

**Key design principle**: The Harness layer is fully decoupled from the Apps layer. `VLMProvider` is a unified interface — today you can use `MockVLMProvider` to play scripted events, tomorrow swap in `QwenVLMProvider` for a real API. **Zero business-code changes required.**

---

## 🚀 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
# → Open http://localhost:5173 in your browser

# 3. Build for production
npm run build

# 4. Preview the production build
npm run preview
```

After loading, you'll see:

1. 🖥️ **BootScreen** — the classic blue-and-white boot animation
2. 🔐 **LoginDialog** — choose "Teacher Login" or "Student Login"
3. 🪟 **Desktop** — desktop icons + Start menu + taskbar
4. 🎯 Double-click any icon to open the corresponding App window

---

## 🧩 Tech Stack

| Category | Choice |
| --- | --- |
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + hand-rolled Win95 component styles (`.win-text` / `.win-sunken` / `.win-fieldset`) |
| State | Zustand (multiple stores: auth / session / profile / wiki / window) |
| Icons | lucide-react + react-icons |
| Charts | recharts (radar / line) |
| Persistence | Browser LocalStorage (zero-backend, works out of the box) |

---

## 🗂️ Project Layout

```
src/
├── shell/           # Win95-style: desktop, window, taskbar, login, boot
├── apps/            # Business apps
│   ├── scenarios/   # 5 scenarios: classroom / pe / lab / workshop / microlesson
│   ├── ReportApp.tsx
│   ├── ProfileApp.tsx
│   ├── WikiApp.tsx
│   ├── NotesApp.tsx
│   └── AboutApp.tsx
├── components/      # Reusable: Timeline · RadarChart · TrendChart · TypingStream · ChatAssistant ...
├── harness/         # VLM orchestration: VLMProvider interface + MockProvider + Adapter slot
├── stores/          # Zustand stores
├── data/            # Seed data + LocalStorage persistence
├── theme/           # Win95 theme styles
├── App.tsx
└── main.tsx
```

---

## 📜 License

This project is released under the **[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/deed.en)** license.

You are free to:

- ✅ **Share** — copy and redistribute the material in any medium or format
- ✅ **Adapt** — remix, transform, and build upon the material

Under the following terms:

- 📛 **Attribution** — You must give appropriate credit, provide a link to the project home page and the original author, and indicate if changes were made.
- 🚫 **NonCommercial** — You may not use the material for any commercial purpose (including but not limited to: sales, paid services, commercial training, integration into commercial products, ad monetization, etc.).

> TL;DR — **Want to repost, remix, or use it for teaching? Go ahead — just credit the original author and project URL. Want to use it commercially? Nope.**

The full legal text is available in the [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- Salute to **Microsoft Windows 95** — a product that defined what a "personal computer desktop" should be.
- Salute to every open-source **VLM / Qwen-VL / GPT-4V** — for making "let AI see the world" possible.
- Salute to pixel art, retro UI, and everyone who makes software feel fun again.

---

<div align="center">

**Made with ❤️ and a floppy disk · © 1995-2026 VLM Systems Inc.**

*This repository is a demonstration project. All student/teacher names and classroom data are fictional.*

</div>