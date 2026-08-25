import type { AssistantState } from '../../types/assistant'

const LABELS: Record<AssistantState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  understanding: 'Understanding…',
  retrieving: 'Gathering intelligence…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  error: 'Something went wrong',
}

interface StatusIndicatorProps {
  state: AssistantState
  /** Optional override (e.g. a transient recoverable notice). */
  label?: string
}

export function StatusIndicator({ state, label }: StatusIndicatorProps) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-400" aria-live="polite">
      <span
        className="inline-block h-2 w-2 rounded-full bg-blue-400"
        style={{
          boxShadow: state !== 'idle' ? '0 0 8px 2px rgba(96,165,250,0.6)' : undefined,
        }}
      />
      {label ?? LABELS[state]}
    </p>
  )
}
