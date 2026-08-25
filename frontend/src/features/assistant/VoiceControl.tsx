import { MicIcon, StopIcon } from '../../components/icons'

interface VoiceControlProps {
  isRecording: boolean
  disabled: boolean
  onToggle: () => void
  size?: 'md' | 'sm'
}

export function VoiceControl({ isRecording, disabled, onToggle, size = 'md' }: VoiceControlProps) {
  const label = isRecording ? 'Stop recording' : 'Start voice request'
  const isSmall = size === 'sm'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isRecording}
      title={label}
      className={[
        'group grid place-items-center rounded-full border transition-all duration-300',
        isSmall ? 'h-11 w-11' : 'h-16 w-16',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        isRecording
          ? 'border-rose-400/60 bg-rose-500/15 text-rose-200 shadow-[0_0_40px_rgba(244,63,94,0.35)]'
          : 'border-blue-400/30 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20 hover:shadow-[0_0_40px_rgba(59,130,246,0.35)]',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      {isRecording ? (
        <StopIcon className={isSmall ? 'h-5 w-5' : 'h-6 w-6'} />
      ) : (
        <MicIcon className={isSmall ? 'h-5 w-5' : 'h-6 w-6'} />
      )}
    </button>
  )
}
