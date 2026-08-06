import type { ReactNode } from 'react';
import type { SlideDesign, SlideDesignMeta } from '../types';
import { ClassicSlide } from './classic';
import { ModernSlide } from './modern';
import { DataVizSlide } from './dataviz';

/** design 组件统一 props */
export interface SlideDesignProps {
  md: string;
  index: number;
  total: number;
}

/** 3 套 design 元数据（含实质差异说明，供 UI 切换器展示） */
export const SLIDE_DESIGNS: SlideDesignMeta[] = [
  {
    id: 'classic',
    name: '经典板书',
    description: '衬线字体 · 纸张底色 · 标题下划线 · 列表 ▸ · 引用粗左边框',
  },
  {
    id: 'modern',
    name: '现代极简',
    description: '无衬线 · 白底居中 · 色块标题 · 卡片段落 · 大留白',
  },
  {
    id: 'dataviz',
    name: '图表驱动',
    description: '双栏布局 · 编号标题 · 底部进度条 · 表格突出 · 数据强调',
  },
];

/** 按 design 渲染单页幻灯片（编辑预览与演示模式共用） */
export function renderSlide(design: SlideDesign, props: SlideDesignProps): ReactNode {
  switch (design) {
    case 'classic':
      return <ClassicSlide {...props} />;
    case 'modern':
      return <ModernSlide {...props} />;
    case 'dataviz':
      return <DataVizSlide {...props} />;
    default:
      return <ClassicSlide {...props} />;
  }
}
