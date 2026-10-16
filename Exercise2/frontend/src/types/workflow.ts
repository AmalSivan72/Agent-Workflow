import type { Node } from '@xyflow/react';

export type AgentStatus = 'idle' | 'active' | 'success' | 'warning';

export type AgentTrace = {
  input: string;
  thinking: string;
  output: string;
};

export type ApiAgent = {
  name: string;
  role: string;
  trace: AgentTrace;
};

export type ToolCallTrace = {
  invocation_id: string;
  node: string;
  owner: string;
  tool_name: string;
  input: string;
  output: string;
  status: 'running' | 'success' | 'error';
};

export type AgentRunResult = {
  project: string;
  spec: string;
  status: string;
  final_result: string;
  agents: ApiAgent[];
  iteration: number;
  max_iterations: number;
  test_result: Record<string, unknown>;
  tool_calls: ToolCallTrace[];
  artifacts: Record<string, string>;
};

export type AgentNodeData = {
  label: string;
  summary: string;
  status: AgentStatus;
  kind: 'input' | 'agent' | 'tool' | 'terminal';
};

export type TraceSection = keyof AgentTrace;

export type StreamEvent = {
  type: 'node_start' | 'node_complete' | 'tool_start' | 'tool_complete' | 'complete' | 'error';
  node?: string;
  from?: string;
  owner?: string;
  tool_name?: string;
  invocation_id?: string;
  input?: string;
  tool_call?: ToolCallTrace;
  trace?: AgentTrace;
  result?: AgentRunResult;
  message?: string;
};

export type AgentFlowNode = Node<AgentNodeData>;
