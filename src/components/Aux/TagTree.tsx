import React from 'react';

interface TagTreeItem {
  id: number;
  name: string;
  children: TagTreeItem[];
}

interface TagTreeProps {
  nodes: TagTreeItem[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
}

const TagTree: React.FC<TagTreeProps> = ({ nodes, selectedId, onSelect }) => {
  if (!nodes || nodes.length === 0) {
    return <div className="text-muted text-center">No tags available.</div>;
  }

  const renderNode = (node: TagTreeItem, level: number = 0) => (
    <React.Fragment key={node.id}>
      <div
        className={`tag-tree-item d-flex align-items-center ${node.id === selectedId ? 'selected' : ''}`}
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
        <div className="tag-children">
          {node.children.map(child => renderNode(child, level + 1))}
        </div>
      )}
    </React.Fragment>
  );

  return (
    <div className="tag-tree-list">
      {nodes.map(node => renderNode(node))}
    </div>
  );
};

export default TagTree;