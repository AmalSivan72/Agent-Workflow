import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import { FaRobot } from 'react-icons/fa';
import type { AgentNodeData } from '../types/workflow';

function NodeIcon({ kind }: { kind: AgentNodeData['kind'] }) {
  if (kind === 'agent') {
    return <FaRobot className="node-icon agent-icon" />;
  }

  if (kind === 'tool') {
    return (
      <svg className="node-icon tool-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M11.8 4.1a4.1 4.1 0 0 0-5.3 5.3l-4 4a1.8 1.8 0 0 0 2.5 2.5l4-4a4.1 4.1 0 0 0 5.3-5.3l-2.5 2.5-2.5-2.5 2.5-2.5Z" />
      </svg>
    );
  }

  return null;
}

const handlePositions = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
} as const;

export function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData;

  return (
    <div className={`agent-node ${nodeData.kind} ${nodeData.status}${selected ? ' selected' : ''}`}>
      {nodeData.handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handlePositions[handle.position]}
          style={
            handle.position === 'left' || handle.position === 'right'
              ? { top: `${handle.offset}%` }
              : { left: `${handle.offset}%` }
          }
        />
      ))}
      <div className="node-header">
        <span className="status-dot" />
        <NodeIcon kind={nodeData.kind} />
        <strong>{nodeData.label}</strong>
      </div>
      <span className="node-kind">{nodeData.kind === 'input' ? 'Input' : nodeData.kind}</span>
      <div className="node-body">{nodeData.summary}</div>
    </div>
  );
}
