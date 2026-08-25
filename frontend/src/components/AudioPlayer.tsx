import { useCallback, useEffect, useRef, useState } from 'react'

import { useAudioAnalyser } from '../hooks/useAudioAnalyser'
import { useAssistantStore } from '../state/assistantStore'
import { PauseIcon, PlayIcon } from './icons'

interface AudioPlayerProps {
  src: string | null
  onEnded: () => void
}

export function AudioPlayer({ src, onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const setPlaybackLevel = useAssistantStore((s) => s.setPlaybackLevel)

  const { ref: analyserRef, start, stop } = useAudioAnalyser((level) => setPlaybackLevel(level))

  const setElementRef = useCallback(
    (node: HTMLAudioElement | null) => {
      audioRef.current = node
      analyserRef(node)
    },
    [analyserRef],
  )

  // Best-effort autoplay, independent of the analyser. No synchronous state
  // updates: any rejection (autoplay blocked, or a synchronous throw) becomes a
  // promise rejection handled asynchronously.
  useEffect(() => {
    const audio = audioRef.current
    if (!src || !audio) return
    Promise.resolve()
      .then(() => audio.play())
      .catch(() => setFailed(true))
  }, [src])

  // Drive the analyser from playback state only (stable deps, no render loop).
  useEffect(() => {
    if (isPlaying) {
      start()
    } else {
      stop()
      setPlaybackLevel(0)
    }
  }, [isPlaying, start, stop, setPlaybackLevel])

  useEffect(() => {
    return () => {
      setPlaybackLevel(0)
    }
  }, [setPlaybackLevel])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      setFailed(false)
      try {
        void audio.play().catch(() => setFailed(true))
      } catch {
        setFailed(true)
      }
    } else {
      audio.pause()
    }
  }

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={setElementRef}
        src={src ?? undefined}
        onPlay={() => {
          setIsPlaying(true)
          setFailed(false)
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        onError={() => {
          setIsPlaying(false)
          setFailed(true)
        }}
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
        <p className="text-xs text-slate-500">
          {failed ? 'Unavailable' : isPlaying ? 'Playing…' : 'Ready'}
        </p>
      </div>
    </div>
  )
}
