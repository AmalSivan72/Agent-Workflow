import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../App.css';
import type { AgentNodeData } from '../types/workflow';
import { AgentNode } from './AgentNode';

const nodeTypes: NodeTypes = { agentNode: AgentNode };

type WorkflowGraphProps = {
  nodes: Node<AgentNodeData>[];
  edges: Edge[];
  onNodeClick: (event: React.MouseEvent, node: Node<AgentNodeData>) => void;
  onNodesChange: (changes: NodeChange<Node<AgentNodeData>>[]) => void;
  onNodeDragStop: (event: MouseEvent | TouchEvent, node: Node<AgentNodeData>) => void;
};

export function WorkflowGraph({ nodes, edges, onNodeClick, onNodesChange, onNodeDragStop }: WorkflowGraphProps) {
  return (
    <section className="flex min-h-[440px] min-w-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm lg:h-full lg:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Workflow canvas</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Select a node to inspect its activity · drag to rearrange</p>
        </div>

      </div>
      <div className="min-h-[380px] flex-1 lg:min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          nodesDraggable
          fitView
          fitViewOptions={{ padding: 0.14 }}
        >
          <Background color="#e9e4f5" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}
