type WorkflowHeaderProps = {
  loading: boolean;
  disabled?: boolean;
  onReset: () => void;
  onRun: () => void;
};

export function WorkflowHeader({ loading, disabled = false, onReset, onRun }: WorkflowHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-300 bg-white px-4 py-2.5 sm:px-6 lg:h-[60px] lg:flex-nowrap lg:px-8 lg:py-2">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="M6 7.5 12 4l6 3.5v7L12 18l-6-3.5v-7Z" stroke="currentColor" strokeWidth="1.6" />
            <path d="m6.5 7.8 5.5 3.3 5.5-3.3M12 11v6.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="20" r="1.2" fill="currentColor" />
          </svg>
        </div>
        <div>
          <p className="font-brand text-[15px] font-bold tracking-tight text-slate-900">Agent<span className="text-violet-600">Workflow</span></p>
          <p className="text-xs text-slate-500">Agent Communication Visualizer</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={loading || disabled}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-wait disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={loading || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M5.2 3.8a1 1 0 0 1 1.03.04l9 5.2a1.1 1.1 0 0 1 0 1.92l-9 5.2A1 1 0 0 1 4.7 15.3V4.7a1 1 0 0 1 .5-.9Z" />
            </svg>
          )}
          {loading ? 'Agents running…' : 'Run workflow'}
        </button>
      </div>
    </header>
  );
}
