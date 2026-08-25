import { PromptPanel } from './PromptPanel'
import { VoiceControl } from './VoiceControl'

interface FollowUpComposerProps {
  listening: boolean
  busy: boolean
  onSubmit: (text: string) => void
  onMicToggle: () => void
}

export function FollowUpComposer({
  listening,
  busy,
  onSubmit,
  onMicToggle,
}: FollowUpComposerProps) {
  return (
    <div className="flex items-center gap-3">
      <VoiceControl isRecording={listening} disabled={busy} onToggle={onMicToggle} size="sm" />
      <div className="min-w-0 flex-1">
        <PromptPanel onSubmit={onSubmit} busy={busy || listening} />
      </div>
    </div>
  )
}
