import { AnimatePresence, motion } from 'framer-motion'

import { ProjectContextIndicator } from './components/ProjectContextIndicator'
import { StateDebugger } from './components/StateDebugger'
import { AssistantOrb } from './features/assistant/AssistantOrb'
import { FollowUpComposer } from './features/assistant/FollowUpComposer'
import { PromptPanel } from './features/assistant/PromptPanel'
import { StatusIndicator } from './features/assistant/StatusIndicator'
import { useAssistantFlow } from './features/assistant/useAssistantFlow'
import { VoiceControl } from './features/assistant/VoiceControl'
import { IntelligenceWorkspace } from './features/intelligence/IntelligenceWorkspace'
import { useAssistantStore } from './state/assistantStore'

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mx-auto w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      {message}
    </div>
  )
}

function NoticeBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mx-auto w-full rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm text-blue-100"
    >
      {message}
    </div>
  )
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
        V
      </span>
      <span className="text-sm font-semibold tracking-tight text-slate-100">VoxPilot AI</span>
    </div>
  )
}

function statusClass(status: string): string {
  const value = status.toLowerCase()
  if (value === 'green' || value === 'on track') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
  }
  if (value === 'red' || value === 'critical') {
    return 'border-rose-400/30 bg-rose-500/10 text-rose-300'
  }
  return 'border-amber-400/30 bg-amber-500/10 text-amber-300'
}

function statusDot(status: string): string {
  const value = status.toLowerCase()
  if (value === 'green' || value === 'on track') return 'bg-emerald-400'
  if (value === 'red' || value === 'critical') return 'bg-rose-400'
  return 'bg-amber-400'
}

export default function App() {
  const state = useAssistantStore((s) => s.state)
  const userTranscript = useAssistantStore((s) => s.userTranscript)
  const response = useAssistantStore((s) => s.response)
  const intent = useAssistantStore((s) => s.intent)
  const project = useAssistantStore((s) => s.project)
  const audioUrl = useAssistantStore((s) => s.audioUrl)
  const error = useAssistantStore((s) => s.error)
  const notice = useAssistantStore((s) => s.notice)
  const setState = useAssistantStore((s) => s.setState)

  const flow = useAssistantFlow()

  const hasResponse = response !== null
  const listening = state === 'listening'
  // In-flight processing states (input stays disabled to avoid conflicting
  // requests). 'speaking' is deliberately excluded: the user may barge in.
  const busy = state === 'understanding' || state === 'retrieving' || state === 'thinking'

  const handleAudioEnded = () => {
    if (useAssistantStore.getState().state === 'speaking') {
      setState('idle')
    }
  }

  const orbLabel = listening ? 'Stop recording' : 'Ask VoxPilot'
  const statusLabel = notice ?? undefined

  return (
    <div className="app-bg flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark />
      </header>

      <AnimatePresence mode="popLayout">
        {!hasResponse ? (
          <motion.main
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center px-6 pb-24"
          >
            {error && (
              <div className="mb-6 w-full max-w-xl">
                <ErrorBanner message={error} />
              </div>
            )}
            {notice && (
              <div className="mb-6 w-full max-w-xl">
                <NoticeBanner message={notice} />
              </div>
            )}

            <motion.div
              layoutId="voxpilot-orb"
              className="h-64 w-64 sm:h-80 sm:w-80"
              transition={{ type: 'spring', stiffness: 180, damping: 26 }}
            >
              <AssistantOrb
                interactive
                disabled={busy}
                onClick={() => void flow.toggleListening()}
                label={orbLabel}
              />
            </motion.div>

            <h1 className="mt-10 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
              Ask VoxPilot
            </h1>
            <p className="mt-2 max-w-md text-center text-sm text-slate-400">
              Your enterprise voice copilot for briefings, delivery risk and project intelligence.
            </p>

            <div className="mt-5">
              <ProjectContextIndicator />
            </div>

            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <VoiceControl
                  isRecording={listening}
                  disabled={busy}
                  onToggle={() => void flow.toggleListening()}
                />
                <StatusIndicator state={state} label={statusLabel} />
              </div>

              <div className="w-full max-w-md">
                <PromptPanel onSubmit={(text) => void flow.submitText(text)} busy={listening || busy} />
              </div>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="workspace"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col"
          >
            {/* Project header */}
            <div className="sticky top-0 z-20 border-b border-slate-800/60 bg-[#05070d]/85 backdrop-blur-md">
              <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6 sm:px-10">
                <motion.div
                  layoutId="voxpilot-orb"
                  className="h-11 w-11 shrink-0"
                  transition={{ type: 'spring', stiffness: 180, damping: 26 }}
                >
                  <AssistantOrb
                    interactive
                    disabled={busy}
                    onClick={() => void flow.toggleListening()}
                    label={orbLabel}
                    detail="compact"
                  />
                </motion.div>

                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-100">
                    {project?.project_name ?? 'VoxPilot'}
                  </span>
                  <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300">
                    Demo data
                  </span>
                  {project?.status && (
                    <span
                      className={`hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-flex ${statusClass(
                        project.status,
                      )}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(project.status)}`} />
                      {project.status}
                    </span>
                  )}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-4">
                  <div className="hidden sm:block">
                    <StatusIndicator state={state} label={statusLabel} />
                  </div>
                  <button
                    type="button"
                    onClick={flow.startNewConversation}
                    className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
                  >
                    New conversation
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mx-auto w-full max-w-6xl flex-1 px-6 pb-8 pt-6 sm:px-10">
              {error && (
                <div className="mb-5">
                  <ErrorBanner message={error} />
                </div>
              )}
              {notice && (
                <div className="mb-5">
                  <NoticeBanner message={notice} />
                </div>
              )}
              <IntelligenceWorkspace
                userTranscript={userTranscript}
                response={response}
                intent={intent}
                project={project}
                audioUrl={audioUrl}
                onAudioEnded={handleAudioEnded}
              />
            </div>

            {/* Follow-up composer */}
            <div className="sticky bottom-0 z-20 border-t border-slate-800/60 bg-[#05070d]/85 backdrop-blur-md">
              <div className="mx-auto max-w-3xl px-6 py-3 sm:px-10">
                <FollowUpComposer
                  listening={listening}
                  busy={busy}
                  onSubmit={(text) => void flow.submitText(text)}
                  onMicToggle={() => void flow.toggleListening()}
                />
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      <StateDebugger />
    </div>
  )
}
