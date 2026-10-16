import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import type { AgentNodeData } from '../types/workflow';

function NodeIcon({ kind }: { kind: AgentNodeData['kind'] }) {
  if (kind === 'agent') {
    return (
      <svg className="node-icon agent-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.5v2M8.8 2.5h2.4M4 10.2a6 6 0 0 1 12 0v4.1a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 14.3v-4.1Z" />
        <path d="M7.2 10.2h.1m5.4 0h.1M7.5 13.2h5" />
      </svg>
    );
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

export function AgentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData;

  return (
    <div className={`agent-node ${nodeData.kind} ${nodeData.status}${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="target" />
      <div className="node-header">
        <span className="status-dot" />
        <NodeIcon kind={nodeData.kind} />
        <strong>{nodeData.label}</strong>
      </div>
      <span className="node-kind">{nodeData.kind === 'input' ? 'Input' : nodeData.kind}</span>
      <div className="node-body">{nodeData.summary}</div>
      <Handle type="source" position={Position.Right} id="source" />
      {id === 'write_file' ? (
        <>
          <Handle type="target" position={Position.Top} id="tool-target-tests" style={{ left: '29%' }} />
          <Handle type="target" position={Position.Top} id="tool-target-implementation" style={{ left: '76%' }} />
        </>
      ) : nodeData.kind === 'tool' ? (
        <Handle type="target" position={Position.Top} id="tool-target" />
      ) : null}
      {nodeData.kind === 'agent' ? <Handle type="source" position={Position.Bottom} id="tool-source" /> : null}
      {id === 'coder' ? <Handle type="target" position={Position.Top} id="loop-target" /> : null}
      {id === 'reviewer' ? <Handle type="source" position={Position.Top} id="loop-source" /> : null}
    </div>
  );
}
