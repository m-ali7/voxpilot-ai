import { useCallback, useEffect, useRef, useState } from 'react'

import { useAudioAnalyser } from '../hooks/useAudioAnalyser'
import { useAssistantStore } from '../state/assistantStore'
import { PauseIcon, PlayIcon } from './icons'

interface AudioPlayerProps {
  onEnded: () => void
}

/**
 * Plays the current turn's audio segments in order. The component is keyed by
 * `audioEpoch` (via ResponsePanel) so a new turn / interruption remounts it with
 * a fresh <audio> element — guaranteeing the previous turn's audio can never
 * replay or leak into the new turn.
 */
export function AudioPlayer({ onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const waitingRef = useRef(false)

  const queue = useAssistantStore((s) => s.audioQueue)
  const complete = useAssistantStore((s) => s.audioComplete)
  const setPlaybackLevel = useAssistantStore((s) => s.setPlaybackLevel)

  const { ref: analyserRef, start, stop } = useAudioAnalyser((level) => setPlaybackLevel(level))

  const setElementRef = useCallback(
    (node: HTMLAudioElement | null) => {
      audioRef.current = node
      analyserRef(node)
    },
    [analyserRef],
  )

  const currentUrl = queue[index]?.url ?? null
  const hasAudio = queue.length > 0

  // Autoplay the current segment.
  useEffect(() => {
    const audio = audioRef.current
    if (!currentUrl || !audio) return
    setFailed(false)
    Promise.resolve()
      .then(() => audio.play())
      .catch(() => setFailed(true))
  }, [currentUrl])

  // Advance when the next segment arrives while waiting for more audio.
  useEffect(() => {
    if (waitingRef.current && queue.length > index + 1) {
      waitingRef.current = false
      setIndex(index + 1)
    }
  }, [queue.length, index])

  // Drive the analyser from playback state.
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

  const handleEnded = () => {
    if (index + 1 < queue.length) {
      setIndex(index + 1)
    } else if (complete) {
      onEnded()
    } else {
      waitingRef.current = true
    }
  }

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

  const status = failed ? 'Unavailable' : isPlaying ? 'Playing…' : hasAudio ? 'Ready' : 'Unavailable'

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={setElementRef}
        src={currentUrl ?? undefined}
        onPlay={() => {
          setIsPlaying(true)
          setFailed(false)
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false)
          handleEnded()
        }}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={!hasAudio}
        aria-label={isPlaying ? 'Pause voice briefing' : 'Play voice briefing'}
        className="grid h-10 w-10 place-items-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-100 transition-colors hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </button>
      <div className="text-sm">
        <p className="font-medium text-slate-200">Voice briefing</p>
        <p className="text-xs text-slate-500">{status}</p>
      </div>
    </div>
  )
}
