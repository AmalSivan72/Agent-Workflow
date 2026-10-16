import { useMemo, useState } from 'react';
import {
  MarkerType,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { SpecificationPanel } from '../components/SpecificationPanel';
import { WorkflowGraph } from '../components/WorkflowGraph';
import { WorkflowHeader } from '../components/WorkflowHeader';
import { WorkflowInspector } from '../components/WorkflowInspector';
import { baseEdges, baseNodes, defaultSpec, getNodeHandles } from '../data/workflow';
import type {
  AgentNodeData,
  AgentRunResult,
  AgentStatus,
  AgentTrace,
  StreamEvent,
  TraceSection,
  ToolCallTrace,
} from '../types/workflow';

const eventNodeIds: Record<string, string> = {
  test_case_generator: 'generator',
  code_generator: 'coder',
  reviewer: 'reviewer',
  finish: 'complete',
};

const toolNodeIds: Record<string, string> = {
  write_test_cases: 'write_file',
  write_implementation: 'write_file',
  run_pytest: 'run_pytest',
};

const toolEdgeIds: Record<string, string> = {
  write_test_cases: 'e-generator-write-tests',
  write_implementation: 'e-coder-write-implementation',
  run_pytest: 'e-reviewer-pytest',
};

function WorkflowPage() {
  const [specInput, setSpecInput] = useState(defaultSpec);
  const [runResult, setRunResult] = useState<AgentRunResult | null>(null);
  const [traces, setTraces] = useState<Record<string, AgentTrace>>({});
  const [toolCalls, setToolCalls] = useState<ToolCallTrace[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, AgentStatus>>(() =>
    Object.fromEntries(baseNodes.map((node) => [node.id, 'idle'])),
  );
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [nodeMeasurements, setNodeMeasurements] = useState<Record<string, { width: number; height: number }>>({});
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [traversedEdges, setTraversedEdges] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState('requirement');
  const [activeTab, setActiveTab] = useState<TraceSection>('input');
  const [selectedToolInvocationId, setSelectedToolInvocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedNode = baseNodes.find((node) => node.id === selectedNodeId) ?? baseNodes[0];
  const selectedTrace = traces[selectedNodeId];
  const selectedToolCalls = toolCalls.filter((call) => toolNodeIds[call.node] === selectedNodeId);
  const selectedToolCall =
    selectedToolCalls.find((call) => call.invocation_id === selectedToolInvocationId) ??
    selectedToolCalls[selectedToolCalls.length - 1];

  const nodes = useMemo<Node<AgentNodeData>[]>(
    () =>
      baseNodes.map((node) => ({
        ...node,
        position: nodePositions[node.id] ?? node.position,
        measured: nodeMeasurements[node.id] ?? node.measured,
        selected: node.id === selectedNodeId,
        handles: getNodeHandles(node.id, node.data.kind),
        data: {
          ...node.data,
          status: nodeStatuses[node.id] ?? 'idle',
        },
      })),
    [nodeMeasurements, nodePositions, nodeStatuses, selectedNodeId],
  );

  const edges = useMemo<Edge[]>(
    () =>
      baseEdges.map((edge) => ({
        ...edge,
        animated: loading && edge.id === activeEdgeId,
        style: {
          ...edge.style,
          stroke: edge.id === activeEdgeId
            ? '#8b5cf6'
            : traversedEdges.includes(edge.id)
              ? '#a78bfa'
              : edge.style?.stroke,
          strokeWidth: edge.id === activeEdgeId ? 3 : 2,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: edge.id === activeEdgeId ? '#8b5cf6' : undefined },
      })),
    [activeEdgeId, loading, traversedEdges],
  );

  const handleRunAgent = async () => {
    let currentFlowNodeId: string | null = null;
    let currentAgentEdgeId: string | null = null;
    setError(null);
    setRunResult(null);
    setTraces({});
    setToolCalls([]);
    setNodeStatuses(Object.fromEntries(baseNodes.map((node) => [node.id, 'idle'])));
    setActiveNodeId(null);
    setActiveEdgeId(null);
    setTraversedEdges([]);
    setSelectedNodeId('requirement');
    setActiveTab('input');
    setSelectedToolInvocationId(null);
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/run-agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specification: specInput }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => 'Request failed.');
        throw new Error(detail || 'Agent request failed.');
      }

      if (!response.body) throw new Error('The server did not provide an event stream.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedCompleteEvent = false;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith('data:'));
          if (!dataLine) continue;

          const event = JSON.parse(dataLine.slice(5).trim()) as StreamEvent;
          if (event.type === 'error') throw new Error(event.message || 'Agent workflow failed.');

          if (event.type === 'node_start' || event.type === 'node_complete') {
            const nodeId = event.node ? eventNodeIds[event.node] : undefined;
            if (!nodeId) continue;

            if (event.type === 'node_start') {
              const sourceId = event.from ? eventNodeIds[event.from] ?? event.from : 'requirement';
              currentAgentEdgeId = baseEdges.find(
                (edge) => edge.source === sourceId && edge.target === nodeId,
              )?.id ?? null;
              currentFlowNodeId = nodeId;
              setActiveNodeId(nodeId);
              setActiveEdgeId(currentAgentEdgeId);
              setSelectedNodeId(nodeId);
              setActiveTab('input');
              setSelectedToolInvocationId(null);
              setNodeStatuses((current) => ({ ...current, requirement: 'success', [nodeId]: 'active' }));
            } else {
              setNodeStatuses((current) => ({ ...current, [nodeId]: 'success' }));
              if (currentAgentEdgeId) {
                setTraversedEdges((current) => [...new Set([...current, currentAgentEdgeId!])]);
              }
              if (event.trace && nodeId !== 'complete') {
                setTraces((current) => ({ ...current, [nodeId]: event.trace! }));
              }
            }
          }

          if (event.type === 'tool_start') {
            const toolEventId = event.node;
            const owner = event.owner;
            const nodeId = toolEventId ? toolNodeIds[toolEventId] : undefined;
            const ownerId = owner ? eventNodeIds[owner] : undefined;
            if (!toolEventId || !nodeId || !ownerId || !event.invocation_id || !event.tool_name) continue;
            const toolCall: ToolCallTrace = {
              invocation_id: event.invocation_id,
              node: toolEventId,
              owner: owner!,
              tool_name: event.tool_name,
              input: event.input ?? '',
              output: '',
              status: 'running',
            };
            currentFlowNodeId = nodeId;
            setToolCalls((current) => [...current, toolCall]);
            setActiveNodeId(nodeId);
            setActiveEdgeId(toolEdgeIds[toolEventId] ?? null);
            setSelectedNodeId(nodeId);
            setSelectedToolInvocationId(event.invocation_id);
            setActiveTab('input');
            setNodeStatuses((current) => ({ ...current, [ownerId]: 'active', [nodeId]: 'active' }));
          }

          if (event.type === 'tool_complete' && event.tool_call) {
            const toolCall = event.tool_call;
            const ownerId = event.owner ? eventNodeIds[event.owner] : undefined;
            const toolNodeId = toolNodeIds[toolCall.node];
            setToolCalls((current) => current.map((call) =>
              call.invocation_id === toolCall.invocation_id ? toolCall : call,
            ));
            if (toolNodeId) {
              setNodeStatuses((current) => ({ ...current, [toolNodeId]: toolCall.status === 'success' ? 'success' : 'warning' }));
            }
            const toolEdgeId = toolEdgeIds[toolCall.node];
            if (toolEdgeId && toolCall.status === 'success') {
              setTraversedEdges((current) => [...new Set([...current, toolEdgeId])]);
            }
            if (ownerId) {
              currentFlowNodeId = ownerId;
              setActiveNodeId(ownerId);
              setActiveEdgeId(currentAgentEdgeId);
              setNodeStatuses((current) => ({ ...current, [ownerId]: 'active' }));
            }
          }

          if (event.type === 'complete' && event.result) {
            const completedTraces = Object.fromEntries(
              event.result.agents.map((agent, index) => [
                ['generator', 'coder', 'reviewer'][index],
                agent.trace,
              ]),
            );
            setRunResult(event.result);
            setTraces(completedTraces);
            setToolCalls(event.result.tool_calls ?? []);
            setNodeStatuses((current) => ({
              ...current,
              requirement: 'success',
              generator: 'success',
              coder: 'success',
              reviewer: 'success',
              complete: event.result?.status === 'completed' ? 'success' : 'warning',
            }));
            const completionEdge = 'e-reviewer-complete';
            setActiveNodeId('complete');
            setActiveEdgeId(completionEdge);
            setTraversedEdges((current) => [...new Set([...current, completionEdge])]);
            setSelectedNodeId('reviewer');
            setActiveTab('output');
            receivedCompleteEvent = true;
          }
        }

        if (done) break;
      }

      if (!receivedCompleteEvent) throw new Error('The agent stream ended before the workflow completed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error while triggering the agents.');
      if (currentFlowNodeId) {
        setNodeStatuses((current) => ({ ...current, [currentFlowNodeId!]: 'warning' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRunResult(null);
    setTraces({});
    setToolCalls([]);
    setNodeStatuses(Object.fromEntries(baseNodes.map((node) => [node.id, 'idle'])));
    setActiveNodeId(null);
    setActiveEdgeId(null);
    setTraversedEdges([]);
    setSelectedNodeId('requirement');
    setActiveTab('input');
    setSelectedToolInvocationId(null);
    setError(null);
  };

  const handleNodeClick = (_event: React.MouseEvent, node: Node<AgentNodeData>) => {
    setSelectedNodeId(node.id);
    setActiveTab('input');
    const latestCall = toolCalls.filter((call) => toolNodeIds[call.node] === node.id).at(-1);
    setSelectedToolInvocationId(latestCall?.invocation_id ?? null);
  };

  const handleNodesChange = (changes: NodeChange<Node<AgentNodeData>>[]) => {
    const positionChanges = changes.filter(
      (change): change is Extract<NodeChange<Node<AgentNodeData>>, { type: 'position' }> =>
        change.type === 'position' && Boolean(change.position),
    );
    if (positionChanges.length) {
      setNodePositions((current) => ({
        ...current,
        ...Object.fromEntries(positionChanges.map((change) => [change.id, change.position!])),
      }));
    }

    const dimensionChanges: Array<{ id: string; dimensions: { width: number; height: number } }> = [];
    for (const change of changes) {
      if (change.type === 'dimensions' && change.dimensions?.width && change.dimensions.height) {
        dimensionChanges.push({ id: change.id, dimensions: change.dimensions });
      }
    }
    if (dimensionChanges.length) {
      setNodeMeasurements((current) => ({
        ...current,
        ...Object.fromEntries(dimensionChanges.map((change) => [change.id, change.dimensions])),
      }));
    }
  };

  const handleNodeDragStop = (_event: MouseEvent | TouchEvent, node: Node<AgentNodeData>) => {
    setNodePositions((current) => ({ ...current, [node.id]: node.position }));
  };

  return (
    <div className="min-h-screen bg-[#f8f7fc] text-slate-900 lg:h-screen lg:overflow-hidden">
      <WorkflowHeader loading={loading} onReset={handleReset} onRun={handleRunAgent} />
      <main className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:flex lg:h-[calc(100%-60px)] lg:min-h-0 lg:flex-col lg:px-8 lg:py-3">
        <SpecificationPanel value={specInput} onChange={setSpecInput} />
        {error ? (
          <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
            <span className="font-semibold">Workflow error:</span> {error}
          </div>
        ) : null}

        <div className="mt-4 grid min-h-[520px] grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_350px]">
          <WorkflowGraph
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            onNodesChange={handleNodesChange}
            onNodeDragStop={handleNodeDragStop}
          />
          <WorkflowInspector
            selectedNode={selectedNode}
            nodeStatuses={nodeStatuses}
            loading={loading}
            error={error}
            runResult={runResult}
            activeNodeId={activeNodeId}
            selectedTrace={selectedTrace}
            selectedToolCalls={selectedToolCalls}
            selectedToolCall={selectedToolCall}
            activeTab={activeTab}
            specInput={specInput}
            onTabChange={setActiveTab}
            onToolCallSelect={(invocationId) => {
              setSelectedToolInvocationId(invocationId);
              setActiveTab('input');
            }}
          />
        </div>
      </main>
    </div>
  );
}

export { WorkflowPage };
