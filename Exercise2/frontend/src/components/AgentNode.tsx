import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import type { AgentNodeData } from '../types/workflow';

export function AgentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData;

  return (
    <div className={`agent-node ${nodeData.kind} ${nodeData.status}${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="target" />
      <div className="node-header">
        <span className="status-dot" />
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
