import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite Dev Server 配置
 *
 * 代理 `/api/llm/*` → `https://opencode.ai/zen/go/v1/*`：
 * 浏览器 fetch `/api/llm/chat/completions` 由 dev server 转发到真实 OpenAI 兼容端点，
 * 绕开 CORS（外部 LLM 通常不返回 Access-Control-Allow-Origin）。
 *
 * 用途：所有 LLM Provider（VLM OpenAI/Capability/Governance/Portal/lessonPlan/slides）
 * 都把 baseURL 设为 `/api/llm`，OpenAIAdapter 已默认走 `/api/llm`，
 * 现在其它 Provider 与默认 store 也对齐此相对路径。
 *
 * 生产部署：应通过 Nginx/Caddy 把 `/api/llm/*` 反代到上游（详见 API_INTEGRATION_GUIDE §八 方案 A）。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api/llm': {
        target: 'https://opencode.ai/zen/go/v1',
        changeOrigin: true,
        // Vite 会把 /api/llm/chat/completions 改成 /chat/completions 再转发：
        rewrite: (path) => path.replace(/^\/api\/llm/, ''),
        secure: true,
      },
    },
  },
});
