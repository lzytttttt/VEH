import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * 设备检测 Hook —— 全项目唯一的移动端断点判断入口。
 * 使用 matchMedia 而非 resize 事件，仅在断点跨越时触发回调，无高频重渲染开销。
 * 断点：768px 以下视为移动端（对应 Tailwind md 断点）。
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
