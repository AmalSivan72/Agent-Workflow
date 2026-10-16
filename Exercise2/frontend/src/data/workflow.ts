import {
  MarkerType,
  Position,
  type Edge,
  type Node,
} from '@xyflow/react';
import type { AgentNodeData } from '../types/workflow';

export const defaultSpec = 'Build a feature that validates numeric input against a specification.';

export const getNodeHandles = (
  nodeId: string,
  kind: AgentNodeData['kind'],
): NonNullable<Node<AgentNodeData>['handles']> => {
  const handles: NonNullable<Node<AgentNodeData>['handles']> = [
    { id: 'target', type: 'target', position: Position.Left, x: -4, y: 40, width: 8, height: 8 },
    { id: 'source', type: 'source', position: Position.Right, x: 156, y: 40, width: 8, height: 8 },
  ];

  if (kind === 'agent') {
    handles.push({ id: 'tool-source', type: 'source', position: Position.Bottom, x: 76, y: 84, width: 8, height: 8 });
  }
  if (nodeId === 'write_file') {
    handles.push(
      { id: 'tool-target-tests', type: 'target', position: Position.Top, x: 42, y: -4, width: 8, height: 8 },
      { id: 'tool-target-implementation', type: 'target', position: Position.Top, x: 118, y: -4, width: 8, height: 8 },
    );
  } else if (kind === 'tool') {
    handles.push({ id: 'tool-target', type: 'target', position: Position.Top, x: 76, y: -4, width: 8, height: 8 });
  }
  if (nodeId === 'coder') {
    handles.push({ id: 'loop-target', type: 'target', position: Position.Top, x: 124, y: -4, width: 8, height: 8 });
  }
  if (nodeId === 'reviewer') {
    handles.push({ id: 'loop-source', type: 'source', position: Position.Top, x: 36, y: -4, width: 8, height: 8 });
  }

  return handles;
};

export const baseNodes: Node<AgentNodeData>[] = [
  {
    id: 'requirement',
    type: 'agentNode',
    position: { x: 20, y: 190 },
    width: 160,
    height: 88,
    data: { label: 'Specification', summary: 'User requirement', status: 'idle', kind: 'input' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'generator',
    type: 'agentNode',
    position: { x: 260, y: 85 },
    width: 160,
    height: 88,
    data: { label: 'Test Case Generator', summary: 'Derive acceptance coverage', status: 'idle', kind: 'agent' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'write_file',
    type: 'agentNode',
    position: { x: 440, y: 300 },
    width: 160,
    height: 88,
    data: { label: 'write_file', summary: 'Write tests or implementation', status: 'idle', kind: 'tool' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'coder',
    type: 'agentNode',
    position: { x: 550, y: 85 },
    width: 160,
    height: 88,
    data: { label: 'Code Generator', summary: 'Implement spec + tests', status: 'idle', kind: 'agent' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'reviewer',
    type: 'agentNode',
    position: { x: 840, y: 190 },
    width: 160,
    height: 88,
    data: { label: 'Reviewer', summary: 'Run tests, route failures', status: 'idle', kind: 'agent' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'run_pytest',
    type: 'agentNode',
    position: { x: 840, y: 340 },
    width: 160,
    height: 88,
    data: { label: 'run_pytest', summary: 'Execute acceptance suite', status: 'idle', kind: 'tool' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'complete',
    type: 'agentNode',
    position: { x: 1140, y: 190 },
    width: 160,
    height: 88,
    data: { label: 'Complete', summary: 'Passed or max attempts', status: 'idle', kind: 'terminal' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
];

export const baseEdges: Edge[] = [
  {
    id: 'e-requirement-generator',
    source: 'requirement',
    sourceHandle: 'source',
    target: 'generator',
    targetHandle: 'target',
    label: 'specification',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#a78bfa', strokeWidth: 2 },
  },
  {
    id: 'e-generator-coder',
    source: 'generator',
    sourceHandle: 'source',
    target: 'coder',
    targetHandle: 'target',
    label: 'tests + spec',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  },
  {
    id: 'e-coder-reviewer',
    source: 'coder',
    sourceHandle: 'source',
    target: 'reviewer',
    targetHandle: 'target',
    label: 'implementation',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#c4b5fd', strokeWidth: 2 },
  },
  {
    id: 'e-reviewer-complete',
    source: 'reviewer',
    sourceHandle: 'source',
    target: 'complete',
    targetHandle: 'target',
    label: 'pass or attempt cap',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#a78bfa', strokeWidth: 2 },
  },
  {
    id: 'e-reviewer-coder',
    source: 'reviewer',
    sourceHandle: 'loop-source',
    target: 'coder',
    targetHandle: 'loop-target',
    label: 'pytest failed · retry (max 2)',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#f0abfc', strokeWidth: 2 },
  },
  {
    id: 'e-generator-write-tests',
    source: 'generator',
    sourceHandle: 'tool-source',
    target: 'write_file',
    targetHandle: 'tool-target-tests',
    label: 'writes tests',
    type: 'smoothstep',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#c4b5fd', strokeWidth: 1.5, strokeDasharray: '5 4' },
  },
  {
    id: 'e-coder-write-implementation',
    source: 'coder',
    sourceHandle: 'tool-source',
    target: 'write_file',
    targetHandle: 'tool-target-implementation',
    label: 'writes code',
    type: 'smoothstep',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#c4b5fd', strokeWidth: 1.5, strokeDasharray: '5 4' },
  },
  {
    id: 'e-reviewer-pytest',
    source: 'reviewer',
    sourceHandle: 'tool-source',
    target: 'run_pytest',
    targetHandle: 'tool-target',
    label: 'executes tests',
    type: 'smoothstep',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#c4b5fd', strokeWidth: 1.5, strokeDasharray: '5 4' },
  },
];
