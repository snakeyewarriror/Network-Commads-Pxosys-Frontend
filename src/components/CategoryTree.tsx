import React, { useState } from 'react';

interface TreeNode {
  id: number;
  name: string;
  children?: TreeNode[];
}

interface Props {
  nodes: TreeNode[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  level?: number;
}

const CategoryTree: React.FC<Props> = ({ nodes, selectedId, onSelect, level = 0 }) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpanded(newSet);
  };

  return (
    <ul className="category-tree" style={{ listStyle: 'none', paddingLeft: level * 10 }}>
      {nodes.map(node => (
        <li key={node.id}>
          <div>
            {node.children && node.children.length > 0 && (
              <button
                onClick={() => toggleExpand(node.id)}
                className="btn btn-sm btn-link p-0 me-1"
              >
                {expanded.has(node.id) ? '▼' : '▶'}
              </button>
            )}
            <input
              type="radio"
              checked={selectedId === node.id}
              onChange={() => onSelect(node.id, node.name)}
              className="me-1"
            />
            {node.name}
          </div>
          {node.children && expanded.has(node.id) && (
            <CategoryTree
              nodes={node.children}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

export default CategoryTree;
