import type {
  AgentNodeData,
  AgentRunResult,
  AgentStatus,
  AgentTurnTrace,
  AgentTrace,
  TraceSection,
  ToolCallTrace,
} from '../types/workflow';
import type { Node } from '@xyflow/react';

type WorkflowInspectorProps = {
  selectedNode: Node<AgentNodeData>;
  nodeStatuses: Record<string, AgentStatus>;
  loading: boolean;
  error: string | null;
  runResult: AgentRunResult | null;
  activeNodeId: string | null;
  selectedTrace: AgentTrace | undefined;
  selectedAgentTurns: AgentTurnTrace[];
  selectedAgentTurnIndex: number | null;
  selectedToolCalls: ToolCallTrace[];
  selectedToolCall: ToolCallTrace | undefined;
  activeTab: TraceSection;
  specInput: string;
  onTabChange: (tab: TraceSection) => void;
  onAgentTurnSelect: (turnIndex: number) => void;
  onToolCallSelect: (invocationId: string) => void;
};

const getRunState = (
  loading: boolean,
  error: string | null,
  runResult: AgentRunResult | null,
) => {
  if (loading) return { label: 'Live run', tone: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500 animate-pulse' };
  if (error || runResult?.status === 'failed') {
    return { label: 'Run failed', tone: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
  }
  if (runResult) return { label: 'Run complete', tone: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  return { label: 'Ready', tone: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
};

export function WorkflowInspector({
  selectedNode,
  nodeStatuses,
  loading,
  error,
  runResult,
  activeNodeId,
  selectedTrace,
  selectedAgentTurns,
  selectedAgentTurnIndex,
  selectedToolCalls,
  selectedToolCall,
  activeTab,
  specInput,
  onTabChange,
  onAgentTurnSelect,
  onToolCallSelect,
}: WorkflowInspectorProps) {
  const status = nodeStatuses[selectedNode.id] ?? 'idle';
  const isAgent = selectedNode.data.kind === 'agent';
  const isTool = selectedNode.data.kind === 'tool';
  const runState = getRunState(loading, error, runResult);

  const tracePanel = (label: string, content: string) => (
    <div className="scrollbar-hidden min-h-48 flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 lg:min-h-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">{label}</span>
      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">{content}</pre>
    </div>
  );

  return (
    <aside className="flex min-h-[440px] flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white p-4 shadow-sm lg:h-full lg:min-h-0">
      <div className="-mx-4 -mt-4 flex items-center justify-between border-b border-slate-300 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Run inspector</h2>
        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${runState.tone}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${runState.dot}`} />
          {runState.label}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status === 'active' ? 'animate-pulse bg-violet-500' : status === 'success' ? 'bg-emerald-500' : status === 'warning' ? 'bg-rose-500' : 'bg-slate-300'}`} />
          <span className="text-xs font-medium capitalize text-slate-500">{status}</span>
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            selectedNode.data.kind === 'agent'
              ? 'bg-violet-100 text-violet-700'
              : selectedNode.data.kind === 'tool'
                ? 'bg-fuchsia-50 text-fuchsia-700'
                : 'bg-slate-100 text-slate-600'
          }`}>
            {selectedNode.data.kind}
          </span>
        </div>
        <h3 className="mt-1.5 text-base font-bold tracking-tight text-slate-900">{selectedNode.data.label}</h3>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{selectedNode.data.summary}</p>
      </div>

      {isAgent ? (
        <>
          {selectedAgentTurns.length > 1 ? (
            <div className="scrollbar-hidden mt-3 max-h-16 shrink-0 overflow-auto">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Turn history</p>
              <div className="flex flex-wrap gap-1.5" aria-label="Agent turn history">
                {selectedAgentTurns.map((turn, index) => (
                  <button
                    type="button"
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                      (selectedAgentTurnIndex ?? selectedAgentTurns.length - 1) === index
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200'
                    }`}
                    key={`${selectedNode.id}-turn-${index + 1}`}
                    onClick={() => onAgentTurnSelect(index)}
                  >
                    Turn {index + 1}{turn.trace ? '' : ' · Running'}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex shrink-0 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Agent trace sections">
            {(['input', 'thinking', 'output'] as const).map((section) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === section}
                className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold capitalize transition ${
                  activeTab === section ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                key={section}
                onClick={() => onTabChange(section)}
              >
                {section}
              </button>
            ))}
          </div>
          <div className="mt-2 flex min-h-0 flex-1 flex-col" role="tabpanel">
            {tracePanel(
              activeTab,
              selectedTrace?.[activeTab as keyof AgentTrace] ??
                (loading && activeNodeId === selectedNode.id
                  ? 'Waiting for this agent to return its trace...'
                  : 'No trace available for this node yet.'),
            )}
          </div>
        </>
      ) : isTool ? (
        <>
          <div className="scrollbar-hidden mt-3 max-h-20 shrink-0 overflow-auto">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Invocation history</p>
            <div className="flex flex-wrap gap-1.5" aria-label="Tool invocation history">
              {selectedToolCalls.length ? selectedToolCalls.map((call, index) => (
                <button
                  type="button"
                  className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                    selectedToolCall?.invocation_id === call.invocation_id
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200'
                  }`}
                  key={call.invocation_id}
                  onClick={() => onToolCallSelect(call.invocation_id)}
                >
                  Call {index + 1} · {call.owner === 'test_case_generator' ? 'Test agent' : call.owner === 'code_generator' ? 'Code agent' : 'Reviewer'}
                </button>
              )) : <span className="text-xs text-slate-400">No calls yet</span>}
            </div>
          </div>
          <div className="scrollbar-hidden mt-3 min-h-0 flex-1 space-y-3 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            <section>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
                {selectedToolCall?.tool_name ?? 'Invocation'}
              </span>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">
                {selectedToolCall
                  ? selectedToolCall.input
                  : loading && activeNodeId === selectedNode.id
                    ? 'Waiting for tool invocation...'
                    : 'This tool has not been invoked in this run.'}
              </pre>
            </section>
            <section className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">Tool result</span>
                {selectedToolCall ? (
                  <span className="text-[10px] font-medium capitalize text-slate-500">{selectedToolCall.status}</span>
                ) : null}
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">
                {selectedToolCall?.output || 'No result yet.'}
              </pre>
            </section>
          </div>
        </>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          {tracePanel(
            selectedNode.data.kind === 'input' ? 'Specification' : 'Run result',
            selectedNode.data.kind === 'input'
              ? runResult?.spec ?? specInput
              : runResult?.final_result ?? 'The final result will appear when the workflow completes.',
          )}
        </div>
      )}

      <div className="mt-3 flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-500">
        {(['idle', 'active', 'success', 'warning'] as AgentStatus[]).map((state) => (
          <span className="inline-flex items-center gap-1.5 capitalize" key={state}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              state === 'idle' ? 'bg-slate-300' : state === 'active' ? 'bg-violet-500' : state === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />
            {state}
          </span>
        ))}
      </div>
    </aside>
  );
}
