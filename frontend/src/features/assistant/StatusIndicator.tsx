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
  /** 'inline' keeps the compact text form (hero); 'pill' renders a chrome chip (workspace header). */
  variant?: 'inline' | 'pill'
}

export function StatusIndicator({ state, label, variant = 'inline' }: StatusIndicatorProps) {
  const text = label ?? LABELS[state]
  const dot = (
    <span
      className={variant === 'pill' ? 'h-2 w-2 shrink-0 rounded-full bg-blue-400' : 'inline-block h-2 w-2 rounded-full bg-blue-400'}
      style={{
        boxShadow: state !== 'idle' ? '0 0 8px 2px rgba(96,165,250,0.6)' : undefined,
      }}
    />
  )

  if (variant === 'pill') {
    return (
      <span className="hidden items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/40 px-3 py-1.5 text-sm text-slate-300 sm:inline-flex">
        {dot}
        <span aria-live="polite">{text}</span>
      </span>
    )
  }

  return (
    <p className="flex items-center gap-2 text-sm text-slate-400" aria-live="polite">
      {dot}
      {text}
    </p>
  )
}
