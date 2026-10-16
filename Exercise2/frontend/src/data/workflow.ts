import {
  MarkerType,
  Position,
  type Edge,
  type Node,
} from '@xyflow/react';
import type {
  AgentNodeData,
  AgentStatus,
  WorkflowDefinition,
} from '../types/workflow';

export const defaultSpec = 'Build a feature that validates numeric input against a specification.';

const handlePositions = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
} as const;

export function createWorkflowNodes(
  definition: WorkflowDefinition,
  statuses: Record<string, AgentStatus>,
  positions: Record<string, { x: number; y: number }>,
  measurements: Record<string, { width: number; height: number }>,
  selectedNodeId: string,
): Node<AgentNodeData>[] {
  return definition.nodes.map((node) => {
    const size = measurements[node.id] ?? { width: node.width, height: node.height };

    return {
      id: node.id,
      type: 'agentNode',
      position: positions[node.id] ?? node.position,
      width: node.width,
      height: node.height,
      measured: measurements[node.id],
      selected: node.id === selectedNodeId,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      handles: node.handles.map((handle) => {
        const offset = handle.offset / 100;
        let x: number;
        let y: number;

        if (handle.position === 'left') {
          x = -4;
          y = size.height * offset - 4;
        } else if (handle.position === 'right') {
          x = size.width - 4;
          y = size.height * offset - 4;
        } else if (handle.position === 'top') {
          x = size.width * offset - 4;
          y = -4;
        } else {
          x = size.width * offset - 4;
          y = size.height - 4;
        }

        return {
          id: handle.id,
          type: handle.type,
          position: handlePositions[handle.position],
          x,
          y,
          width: 8,
          height: 8,
        };
      }),
      data: {
        label: node.label,
        summary: node.summary,
        kind: node.kind,
        status: statuses[node.id] ?? 'idle',
        handles: node.handles,
      },
    };
  });
}

export function createWorkflowEdges(definition: WorkflowDefinition): Edge[] {
  return definition.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.source_handle,
    target: edge.target,
    targetHandle: edge.target_handle,
    label: edge.label,
    type: edge.type,
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: edge.style,
  }));
}
