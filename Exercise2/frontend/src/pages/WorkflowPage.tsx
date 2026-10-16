import { useEffect, useMemo, useState } from 'react';
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
import { createWorkflowEdges, createWorkflowNodes, defaultSpec } from '../data/workflow';
import type {
  AgentNodeData,
  AgentRunResult,
  AgentStatus,
  AgentTurnTrace,
  StreamEvent,
  TraceSection,
  ToolCallTrace,
  WorkflowDefinition,
} from '../types/workflow';

const API_BASE_URL = 'http://127.0.0.1:8000';

function WorkflowPage() {
  const [specInput, setSpecInput] = useState(defaultSpec);
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [runResult, setRunResult] = useState<AgentRunResult | null>(null);
  const [agentTurns, setAgentTurns] = useState<Record<string, AgentTurnTrace[]>>({});
  const [selectedAgentTurnIndex, setSelectedAgentTurnIndex] = useState<number | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallTrace[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, AgentStatus>>({});
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [nodeMeasurements, setNodeMeasurements] = useState<Record<string, { width: number; height: number }>>({});
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [traversedEdges, setTraversedEdges] = useState<string[]>([]);
  const [failedEdges, setFailedEdges] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [activeTab, setActiveTab] = useState<TraceSection>('input');
  const [selectedToolInvocationId, setSelectedToolInvocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadDefinition = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/workflow/definition`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Workflow definition request failed (${response.status}).`);
        }

        const definition = await response.json() as WorkflowDefinition;
        setWorkflowDefinition(definition);
        setNodeStatuses(Object.fromEntries(definition.nodes.map((node) => [node.id, 'idle'])));
        setSelectedNodeId(definition.nodes.find((node) => node.kind === 'input')?.id ?? definition.nodes[0]?.id ?? '');
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load the workflow definition.');
      } finally {
        if (!controller.signal.aborted) setGraphLoading(false);
      }
    };

    void loadDefinition();
    return () => controller.abort();
  }, []);

  const eventNodeIds = useMemo(
    () => Object.fromEntries(
      workflowDefinition?.nodes.flatMap((node) => node.event_ids.map((eventId) => [eventId, node.id] as const)) ?? [],
    ),
    [workflowDefinition],
  );
  const toolNodeIds = useMemo(
    () => Object.fromEntries(
      workflowDefinition?.nodes
        .filter((node) => node.kind === 'tool')
        .flatMap((node) => node.event_ids.map((eventId) => [eventId, node.id] as const)) ?? [],
    ),
    [workflowDefinition],
  );
  const inputNodeId = workflowDefinition?.nodes.find((node) => node.kind === 'input')?.id;
  const selectedNodeIdResolved = workflowDefinition?.nodes.some((node) => node.id === selectedNodeId)
    ? selectedNodeId
    : inputNodeId ?? '';
  const selectedNodeDefinition = workflowDefinition?.nodes.find((node) => node.id === selectedNodeIdResolved);
  const selectedAgentTurns = agentTurns[selectedNodeIdResolved] ?? [];
  const selectedTrace = selectedAgentTurns[
    selectedAgentTurnIndex ?? selectedAgentTurns.length - 1
  ]?.trace ?? undefined;
  const selectedToolCalls = toolCalls.filter((call) => toolNodeIds[call.node] === selectedNodeIdResolved);
  const selectedToolCall =
    selectedToolCalls.find((call) => call.invocation_id === selectedToolInvocationId) ??
    selectedToolCalls[selectedToolCalls.length - 1];

  const nodes = useMemo<Node<AgentNodeData>[]>(
    () => workflowDefinition
      ? createWorkflowNodes(workflowDefinition, nodeStatuses, nodePositions, nodeMeasurements, selectedNodeIdResolved)
      : [],
    [nodeMeasurements, nodePositions, nodeStatuses, selectedNodeIdResolved, workflowDefinition],
  );
  const selectedFlowNode = nodes.find((node) => node.id === selectedNodeIdResolved);

  const edges = useMemo<Edge[]>(
    () => (workflowDefinition ? createWorkflowEdges(workflowDefinition) : []).map((edge) => {
      const failed = failedEdges.includes(edge.id);
      const active = loading && edge.id === activeEdgeId && !failed;
      const traversed = traversedEdges.includes(edge.id);
      const color = failed
        ? '#dc2626'
        : active
          ? '#7c3aed'
          : traversed
            ? '#16a34a'
            : '#75658f';

      return {
        ...edge,
        animated: active,
        style: {
          ...edge.style,
          stroke: color,
          strokeWidth: active ? 3.5 : 2.5,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    }),
    [activeEdgeId, failedEdges, loading, traversedEdges, workflowDefinition],
  );

  const findEdge = (source: string | undefined, target: string | undefined) =>
    workflowDefinition?.edges.find((edge) => edge.source === source && edge.target === target);

  const handleRunAgent = async () => {
    if (!workflowDefinition || !inputNodeId) return;
    let currentFlowNodeId: string | null = null;
    let currentAgentEdgeId: string | null = null;
    setError(null);
    setRunResult(null);
    setAgentTurns({});
    setSelectedAgentTurnIndex(null);
    setToolCalls([]);
    setNodeStatuses(Object.fromEntries(workflowDefinition.nodes.map((node) => [node.id, 'idle'])));
    setActiveNodeId(null);
    setActiveEdgeId(null);
    setTraversedEdges([]);
    setFailedEdges([]);
    setSelectedNodeId(inputNodeId);
    setActiveTab('input');
    setSelectedToolInvocationId(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/run-agent/stream`, {
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
              const sourceId = event.from ? eventNodeIds[event.from] ?? event.from : inputNodeId;
              currentAgentEdgeId = findEdge(sourceId, nodeId)?.id ?? null;
              currentFlowNodeId = nodeId;
              setActiveNodeId(nodeId);
              setActiveEdgeId(currentAgentEdgeId);
              setSelectedNodeId(nodeId);
              setActiveTab('input');
              setSelectedToolInvocationId(null);
              setSelectedAgentTurnIndex(null);
              setAgentTurns((current) => ({
                ...current,
                [nodeId]: [...(current[nodeId] ?? []), { trace: null }],
              }));
              setNodeStatuses((current) => ({ ...current, [inputNodeId]: 'success', [nodeId]: 'active' }));
            } else {
              setNodeStatuses((current) => ({ ...current, [nodeId]: 'success' }));
              if (currentAgentEdgeId) {
                setTraversedEdges((current) => [...new Set([...current, currentAgentEdgeId!])]);
              }
              if (event.trace) {
                setAgentTurns((current) => {
                  const turns = current[nodeId] ?? [];
                  const lastTurn = turns[turns.length - 1];
                  return {
                    ...current,
                    [nodeId]: lastTurn
                      ? [...turns.slice(0, -1), { trace: event.trace! }]
                      : [...turns, { trace: event.trace! }],
                  };
                });
                setSelectedAgentTurnIndex(null);
              }
            }
          }

          if (event.type === 'tool_start') {
            const toolEventId = event.node;
            const owner = event.owner;
            const nodeId = toolEventId ? toolNodeIds[toolEventId] : undefined;
            const ownerId = owner ? eventNodeIds[owner] : undefined;
            if (!toolEventId || !nodeId || !owner || !ownerId || !event.invocation_id || !event.tool_name) continue;
            const toolCall: ToolCallTrace = {
              invocation_id: event.invocation_id,
              node: toolEventId,
              owner,
              tool_name: event.tool_name,
              input: event.input ?? '',
              output: '',
              status: 'running',
            };
            currentFlowNodeId = nodeId;
            setToolCalls((current) => [...current, toolCall]);
            setActiveNodeId(nodeId);
            setActiveEdgeId(findEdge(ownerId, nodeId)?.id ?? null);
            setSelectedNodeId(nodeId);
            setSelectedToolInvocationId(event.invocation_id);
            setSelectedAgentTurnIndex(null);
            setActiveTab('input');
            setNodeStatuses((current) => ({ ...current, [ownerId]: 'active', [nodeId]: 'active' }));
          }

          if (event.type === 'tool_complete' && event.tool_call) {
            const toolCall = event.tool_call;
            const ownerId = event.owner ? eventNodeIds[event.owner] : undefined;
            const toolNodeId = toolNodeIds[toolCall.node];
            const toolEdgeId = findEdge(ownerId, toolNodeId)?.id;
            setToolCalls((current) => current.map((call) =>
              call.invocation_id === toolCall.invocation_id ? toolCall : call,
            ));
            if (toolNodeId) {
              setNodeStatuses((current) => ({
                ...current,
                [toolNodeId]: toolCall.status === 'success' ? 'success' : 'warning',
              }));
            }
            if (toolEdgeId && toolCall.status === 'success') {
              setTraversedEdges((current) => [...new Set([...current, toolEdgeId])]);
            } else if (toolEdgeId) {
              setFailedEdges((current) => [...new Set([...current, toolEdgeId])]);
            }
            if (ownerId) {
              currentFlowNodeId = ownerId;
              setActiveNodeId(ownerId);
              setActiveEdgeId(currentAgentEdgeId);
              setNodeStatuses((current) => ({ ...current, [ownerId]: 'active' }));
            }
          }

          if (event.type === 'complete' && event.result) {
            const terminalNodeId = workflowDefinition.nodes.find((node) => node.kind === 'terminal')?.id;
            const reviewerNodeId = workflowDefinition.nodes
              .filter((node) => node.kind === 'agent')
              .at(-1)?.id;
            const completionEdgeId = findEdge(reviewerNodeId, terminalNodeId)?.id;
            const terminalStatus = event.result.status === 'completed' ? 'success' : 'warning';

            setRunResult(event.result);
            setAgentTurns((current) => {
              const updated = { ...current };
              for (const agent of event.result!.agents) {
                const nodeId = eventNodeIds[agent.id];
                if (nodeId && !updated[nodeId]?.length) {
                  updated[nodeId] = [{ trace: agent.trace }];
                }
              }
              return updated;
            });
            setToolCalls(event.result.tool_calls ?? []);
            setNodeStatuses((current) => {
              const updated = { ...current };
              for (const node of workflowDefinition.nodes) {
                if (node.kind === 'input' || node.kind === 'agent') updated[node.id] = 'success';
              }
              if (reviewerNodeId) updated[reviewerNodeId] = terminalStatus;
              if (terminalNodeId) updated[terminalNodeId] = terminalStatus;
              return updated;
            });
            setActiveNodeId(terminalNodeId ?? null);
            setActiveEdgeId(completionEdgeId ?? null);
            if (completionEdgeId && event.result.status === 'completed') {
              setTraversedEdges((current) => [...new Set([...current, completionEdgeId])]);
            } else if (completionEdgeId) {
              setFailedEdges((current) => [...new Set([...current, completionEdgeId])]);
            }
            setSelectedNodeId(reviewerNodeId ?? terminalNodeId ?? inputNodeId);
            setSelectedAgentTurnIndex(null);
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
      if (currentAgentEdgeId) {
        setFailedEdges((current) => [...new Set([...current, currentAgentEdgeId!])]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!workflowDefinition) return;
    setRunResult(null);
    setAgentTurns({});
    setSelectedAgentTurnIndex(null);
    setToolCalls([]);
    setNodeStatuses(Object.fromEntries(workflowDefinition.nodes.map((node) => [node.id, 'idle'])));
    setActiveNodeId(null);
    setActiveEdgeId(null);
    setTraversedEdges([]);
    setFailedEdges([]);
    setSelectedNodeId(inputNodeId ?? '');
    setActiveTab('input');
    setSelectedToolInvocationId(null);
    setError(null);
  };

  const handleNodeClick = (_event: React.MouseEvent, node: Node<AgentNodeData>) => {
    setSelectedNodeId(node.id);
    setActiveTab('input');
    setSelectedAgentTurnIndex(null);
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
      <WorkflowHeader
        loading={loading}
        disabled={graphLoading || !workflowDefinition}
        onReset={handleReset}
        onRun={handleRunAgent}
      />
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
          {selectedNodeDefinition && selectedFlowNode ? (
            <WorkflowInspector
              selectedNode={selectedFlowNode}
              nodeStatuses={nodeStatuses}
              loading={loading}
              error={error}
              runResult={runResult}
              activeNodeId={activeNodeId}
              selectedTrace={selectedTrace}
              selectedAgentTurns={selectedAgentTurns}
              selectedAgentTurnIndex={selectedAgentTurnIndex}
              selectedToolCalls={selectedToolCalls}
              selectedToolCall={selectedToolCall}
              activeTab={activeTab}
              specInput={specInput}
              onTabChange={setActiveTab}
              onAgentTurnSelect={setSelectedAgentTurnIndex}
              onToolCallSelect={(invocationId) => {
                setSelectedToolInvocationId(invocationId);
                setSelectedAgentTurnIndex(null);
                setActiveTab('input');
              }}
            />
          ) : (
            <div className="flex min-h-[440px] items-center justify-center rounded-2xl border border-violet-100 bg-white text-sm text-slate-500 shadow-sm lg:h-full lg:min-h-0">
              {graphLoading ? 'Loading workflow definition…' : 'Workflow inspector unavailable.'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export { WorkflowPage };
