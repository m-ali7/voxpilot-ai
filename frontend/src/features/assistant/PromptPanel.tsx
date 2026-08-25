import { useState } from 'react'
import type { FormEvent } from 'react'

import { SendIcon } from '../../components/icons'

interface PromptPanelProps {
  onSubmit: (text: string) => void
  busy: boolean
}

export function PromptPanel({ onSubmit, busy }: PromptPanelProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const text = value.trim()
    if (!text) return
    onSubmit(text)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-2 backdrop-blur-md transition-colors focus-within:border-blue-400/50"
    >
      <label htmlFor="voxpilot-prompt" className="sr-only">
        Ask VoxPilot
      </label>
      <input
        id="voxpilot-prompt"
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Or type your request…"
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none"
        disabled={busy}
      />
      <button
        type="submit"
        disabled={busy || !value.trim()}
        aria-label="Send request"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/90 text-white transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SendIcon className="h-4 w-4" />
      </button>
    </form>
  )
}
