// src/components/CategoryTree.tsx

import React from 'react';

interface CategoryTreeItem {
  id: number;
  name: string;
  children: CategoryTreeItem[];
}

interface CategoryTreeProps {
  nodes: CategoryTreeItem[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
}

const CategoryTree: React.FC<CategoryTreeProps> = ({ nodes, selectedId, onSelect }) => {
  if (!nodes || nodes.length === 0) {
    return <div className="text-muted text-center">No categories available.</div>;
  }

  const renderNode = (node: CategoryTreeItem, level: number = 0) => (
    <React.Fragment key={node.id}>
      <div
        className={`category-tree-item d-flex align-items-center ${node.id === selectedId ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 15}px`, cursor: 'pointer' }}
        onClick={() => onSelect(node.id, node.name)}
      >
        <span className="me-2">
          {node.children && node.children.length > 0 ? (
            <i className="bi bi-folder-fill text-warning"></i>
          ) : (
            <i className="bi bi-file-earmark"></i>
          )}
        </span>
        {node.name}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="category-children">
          {node.children.map(child => renderNode(child, level + 1))}
        </div>
      )}
    </React.Fragment>
  );

  return (
    <div className="category-tree-list">
      {nodes.map(node => renderNode(node))}
    </div>
  );
};

export default CategoryTree;