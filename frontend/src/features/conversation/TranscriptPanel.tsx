interface TranscriptPanelProps {
  transcript: string
  liveHint?: string
}

export function TranscriptPanel({ transcript, liveHint }: TranscriptPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your request</h2>
      {transcript ? (
        <p className="mt-3 text-slate-100">{transcript}</p>
      ) : (
        <p className="mt-3 italic text-slate-500">{liveHint ?? 'No request yet.'}</p>
      )}
    </section>
  )
}
