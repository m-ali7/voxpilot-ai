import { AudioPlayer } from '../../components/AudioPlayer'
import { useAssistantStore } from '../../state/assistantStore'

interface ResponsePanelProps {
  response: string
  intent: string | null
  onAudioEnded: () => void
}

export function ResponsePanel({ response, intent, onAudioEnded }: ResponsePanelProps) {
  const audioEpoch = useAssistantStore((s) => s.audioEpoch)

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          VoxPilot response
        </h2>
        {intent && (
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
            {intent.replaceAll('_', ' ')}
          </span>
        )}
      </div>
      <p className="mt-3 leading-relaxed text-slate-100">{response}</p>
      <div className="mt-5 border-t border-slate-800/80 pt-4">
        <AudioPlayer key={String(audioEpoch)} onEnded={onAudioEnded} />
      </div>
    </section>
  )
}
