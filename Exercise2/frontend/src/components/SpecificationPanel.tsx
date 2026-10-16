type SpecificationPanelProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SpecificationPanel({ value, onChange }: SpecificationPanelProps) {
  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Your specification</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Describe what the agent team should build and validate.</p>
        </div>
        <span className="hidden rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 sm:inline-flex">
          Input
        </span>
      </div>
      <label className="sr-only" htmlFor="specification">Specification content</label>
      <textarea
        id="specification"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe the requirement or specification to test..."
        className="scrollbar-hidden h-16 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
      />
    </section>
  );
}
