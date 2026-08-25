import { SparklesIcon } from './icons'
import { useAssistantStore } from '../state/assistantStore'

export function ProjectContextIndicator() {
  const projectName = useAssistantStore((s) => s.project?.project_name ?? null)

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-md">
      <SparklesIcon className="h-3.5 w-3.5 text-blue-400" />
      <span>{projectName ?? 'Enterprise delivery context'}</span>
      <span className="h-1 w-1 rounded-full bg-amber-400" />
      <span className="text-amber-300/80">Demo data</span>
    </div>
  )
}
