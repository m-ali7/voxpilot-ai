import { useEffect, useRef, useState } from 'react'

import { PauseIcon, PlayIcon } from './icons'

interface AudioPlayerProps {
  src: string | null
  onEnded: () => void
}

export function AudioPlayer({ src, onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (src && audioRef.current) {
      void audioRef.current.play().catch(() => {
        // Autoplay may be blocked; the user can press play manually.
      })
    }
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={audioRef}
        src={src ?? undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        aria-label={isPlaying ? 'Pause voice briefing' : 'Play voice briefing'}
        className="grid h-10 w-10 place-items-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-100 transition-colors hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </button>
      <div className="text-sm">
        <p className="font-medium text-slate-200">Voice briefing</p>
        <p className="text-xs text-slate-500">{isPlaying ? 'Playing…' : 'Ready'}</p>
      </div>
    </div>
  )
}
