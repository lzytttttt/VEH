import { useEffect, useRef, useState } from 'react';
import type { WikiNode } from '../harness/types';

interface Props {
  node: WikiNode;
  allNodes: WikiNode[];
  onSelectNode: (id: string) => void;
}

interface GNode {
  id: string;
  title: string;
  isCenter: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

const W = 400;
const H = 200;
const REST = 82;
const REPULSION = 4600;
const DAMPING = 0.82;
const CENTER_PULL = 0.06;
const ITERS = 240;

/** 构建初始布局并跑若干轮力模拟使其收敛 */
function buildLayout(node: WikiNode, related: WikiNode[]): GNode[] {
  const arr: GNode[] = [
    { id: node.id, title: node.title, isCenter: true, x: W / 2, y: H / 2, vx: 0, vy: 0, color: '#000080' },
    ...related.map((r, i) => {
      const a = (i / Math.max(related.length, 1)) * Math.PI * 2;
      return {
        id: r.id, title: r.title, isCenter: false,
        x: W / 2 + Math.cos(a) * REST, y: H / 2 + Math.sin(a) * REST,
        vx: 0, vy: 0, color: '#008000',
      };
    }),
  ];
  for (let i = 0; i < ITERS; i++) step(arr);
  return arr.map((n) => ({ ...n, vx: 0, vy: 0 }));
}

/** 单步力模拟：中心拉力 + 节点间排斥 + 中心-关联弹簧 + 阻尼 + 边界 */
function step(arr: GNode[]) {
  for (const n of arr) {
    if (n.isCenter) {
      n.vx += (W / 2 - n.x) * CENTER_PULL;
      n.vy += (H / 2 - n.y) * CENTER_PULL;
    }
  }
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) d2 = 1;
      const d = Math.sqrt(d2);
      const f = REPULSION / d2;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  for (const b of arr) {
    if (b.isCenter) continue;
    const dx = b.x - W / 2, dy = b.y - H / 2;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - REST) * 0.05;
    b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
  }
  for (const n of arr) {
    n.vx *= DAMPING; n.vy *= DAMPING;
    n.x += n.vx; n.y += n.vy;
    n.x = Math.max(26, Math.min(W - 26, n.x));
    n.y = Math.max(22, Math.min(H - 22, n.y));
  }
}

interface ViewBox { x: number; y: number; w: number; h: number; }
const BASE_VB: ViewBox = { x: 0, y: 0, w: W, h: H };

/**
 * 交互式力导向知识图谱 — Win95 风格
 * 支持：节点拖拽 / hover 高亮 / 点击聚焦（跳转关联节点）/ 按钮缩放 / 背景拖动平移
 */
export default function KnowledgeGraph({ node, allNodes, onSelectNode }: Props) {
  const related = node.related
    .map((id) => allNodes.find((n) => n.id === id))
    .filter((n): n is WikiNode => Boolean(n));

  const [g, setG] = useState<GNode[]>(() => buildLayout(node, related));
  const [hovered, setHovered] = useState<string | null>(null);
  const [vb, setVb] = useState<ViewBox>(BASE_VB);
  const [panning, setPanning] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string | null; moved: boolean; sx: number; sy: number }>({ id: null, moved: false, sx: 0, sy: 0 });
  const panRef = useRef<{ active: boolean; lx: number; ly: number; cx: number; cy: number }>({ active: false, lx: 0, ly: 0, cx: 0, cy: 0 });

  useEffect(() => {
    setG(buildLayout(node, related));
    setVb(BASE_VB);
    setHovered(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const clientToUser = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const zoom = (factor: number) => {
    setVb((prev) => {
      const newW = Math.max(80, Math.min(W * 3, prev.w * factor));
      const newH = newW * (H / W);
      const cx = prev.x + prev.w / 2, cy = prev.y + prev.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  };

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { id, moved: false, sx: e.clientX, sy: e.clientY };
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    panRef.current = { active: true, lx: e.clientX, ly: e.clientY, cx: vb.x + vb.w / 2, cy: vb.y + vb.h / 2 };
    setPanning(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current.id != null) {
      const p = clientToUser(e.clientX, e.clientY);
      const dx = e.clientX - dragRef.current.sx, dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
      setG((prev) => prev.map((n) => (n.id === dragRef.current.id ? { ...n, x: p.x, y: p.y, vx: 0, vy: 0 } : n)));
      return;
    }
    if (panRef.current.active && svgRef.current) {
      const ratio = vb.w / svgRef.current.clientWidth;
      const dx = (e.clientX - panRef.current.lx) * ratio;
      const dy = (e.clientY - panRef.current.ly) * ratio;
      panRef.current.lx = e.clientX;
      panRef.current.ly = e.clientY;
      const cx = panRef.current.cx - dx, cy = panRef.current.cy - dy;
      panRef.current.cx = cx;
      panRef.current.cy = cy;
      setVb((prev) => ({ x: cx - prev.w / 2, y: cy - prev.h / 2, w: prev.w, h: prev.h }));
    }
  };

  const onPointerUp = () => {
    if (dragRef.current.id != null) {
      const id = dragRef.current.id;
      const moved = dragRef.current.moved;
      dragRef.current = { id: null, moved: false, sx: 0, sy: 0 };
      if (!moved) onSelectNode(id);
      return;
    }
    panRef.current.active = false;
    setPanning(false);
  };

  const center = g.find((n) => n.isCenter) ?? null;

  return (
    <div className="win-sunken bg-white" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ display: 'block', cursor: panning ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={onBgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          <marker id="kg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#808080" />
          </marker>
        </defs>
        {/* 边 */}
        {center && g.filter((n) => !n.isCenter).map((n) => {
          const isHi = hovered === n.id || hovered === center.id;
          return (
            <line key={`e-${n.id}`} x1={center.x} y1={center.y} x2={n.x} y2={n.y}
              stroke={isHi ? '#000080' : '#808080'} strokeWidth={isHi ? 1.6 : 1}
              markerEnd="url(#kg-arrow)" />
          );
        })}
        {/* 节点 */}
        {g.map((n) => {
          const r = n.isCenter ? 22 : 15;
          const isHi = hovered === n.id;
          return (
            <g key={n.id} style={{ cursor: 'pointer' }}
              onPointerDown={(e) => onNodePointerDown(e, n.id)}
              onPointerEnter={() => setHovered(n.id)}
              onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
            >
              {isHi && <circle cx={n.x} cy={n.y} r={r + 3} fill="none" stroke="#000080" strokeWidth="1" strokeDasharray="2 2" />}
              <circle cx={n.x} cy={n.y} r={r} fill={n.color} stroke="#fff" strokeWidth="1.5" />
              <circle cx={n.x - r * 0.3} cy={n.y - r * 0.3} r={r * 0.35} fill="#fff" opacity={0.25} />
              <text x={n.x} y={n.y + 3} textAnchor="middle" fill="#fff" style={{ fontSize: n.isCenter ? '9px' : '8px', fontWeight: n.isCenter ? 700 : 400 }}>
                {n.title.slice(0, n.isCenter ? 4 : 3)}
              </text>
              <text x={n.x} y={n.y + r + 10} textAnchor="middle" fill="#808000" style={{ fontSize: '8px' }}>
                {n.title.length > 6 ? n.title.slice(0, 6) + '…' : n.title}
              </text>
            </g>
          );
        })}
      </svg>
      {/* 缩放工具栏 */}
      <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '2px' }}>
        <button className="win-button" style={{ fontSize: '11px', padding: '0 6px', minWidth: 0 }} onClick={() => zoom(0.85)} title="放大">＋</button>
        <button className="win-button" style={{ fontSize: '11px', padding: '0 6px', minWidth: 0 }} onClick={() => zoom(1.18)} title="缩小">－</button>
        <button className="win-button" style={{ fontSize: '11px', padding: '0 6px', minWidth: 0 }} onClick={() => setVb(BASE_VB)} title="重置">⟳</button>
      </div>
    </div>
  );
}
