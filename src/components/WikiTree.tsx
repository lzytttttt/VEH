import { useMemo, useState } from 'react';
import type { WikiNode } from '../harness/types';

interface Props {
  nodes: WikiNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface CategoryGroup {
  category: string;
  nodes: WikiNode[];
}

/**
 * 知识点树状导航 — 按 category 分组
 */
export default function WikiTree({ nodes, selectedId, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(nodes[0]?.category ? [nodes[0].category] : []));

  const groups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, WikiNode[]>();
    for (const n of nodes) {
      const list = map.get(n.category) ?? [];
      list.push(n);
      map.set(n.category, list);
    }
    return Array.from(map.entries()).map(([category, list]) => ({ category, nodes: list }));
  }, [nodes]);

  const toggle = (c: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  return (
    <div className="win-sunken bg-white h-full overflow-auto p-1" style={{ fontSize: '12px' }}>
      <div className="px-1 py-1 win-text-bold" style={{ fontSize: '11px', color: '#000080' }}>
        📚 知识结构 ({nodes.length} 节点)
      </div>
      {groups.map((g) => {
        const isOpen = expanded.has(g.category);
        return (
          <div key={g.category} className="mb-1">
            <button
              className="w-full text-left flex items-center gap-1 px-1 py-[2px]"
              style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              onClick={() => toggle(g.category)}
            >
              <span style={{ fontSize: '10px' }}>{isOpen ? '📂' : '📁'}</span>
              <span>{g.category}</span>
              <span className="text-gray-500" style={{ fontSize: '10px' }}>({g.nodes.length})</span>
            </button>
            {isOpen && (
              <div className="ml-3 border-l border-gray-300">
                {g.nodes.map((n) => (
                  <button
                    key={n.id}
                    className="w-full text-left flex items-center gap-1 pl-2 pr-1 py-[2px]"
                    style={{
                      cursor: 'pointer',
                      fontSize: '11px',
                      background: selectedId === n.id ? '#000080' : 'transparent',
                      color: selectedId === n.id ? '#fff' : '#000',
                    }}
                    onClick={() => onSelect(n.id)}
                  >
                    <span>📄</span>
                    <span className="truncate">{n.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
