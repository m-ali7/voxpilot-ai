import { useAssistantStore } from '../state/assistantStore'
import type { AssistantState } from '../types/assistant'

const STATES: AssistantState[] = [
  'idle',
  'listening',
  'understanding',
  'retrieving',
  'thinking',
  'speaking',
  'error',
]

/**
 * DEVELOPER-ONLY control to exercise each assistant state for visual QA.
 * Rendered only in dev builds (import.meta.env.DEV). Remove the <StateDebugger />
 * usage in App.tsx before demo/release.
 */
export function StateDebugger() {
  const state = useAssistantStore((s) => s.state)
  const setState = useAssistantStore((s) => s.setState)

  if (!import.meta.env.DEV) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-1 rounded-xl border border-slate-700/60 bg-slate-900/80 p-2 text-xs backdrop-blur-md">
      <p className="px-1 pb-1 font-semibold uppercase tracking-wider text-amber-400/80">
        Dev — state preview
      </p>
      {STATES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setState(s)}
          className={[
            'rounded-lg px-2 py-1 text-left transition-colors',
            s === state ? 'bg-blue-500/20 text-blue-200' : 'text-slate-400 hover:bg-slate-800',
          ].join(' ')}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
