import type { ReactNode } from 'react'

import { ResponsePanel } from '../conversation/ResponsePanel'
import { TranscriptPanel } from '../conversation/TranscriptPanel'
import type { ProjectIntelligence, ProjectRisk } from '../../types/api'

interface IntelligenceWorkspaceProps {
  userTranscript: string
  response: string | null
  intent: string | null
  project: ProjectIntelligence | null
  audioUrl: string | null
  onAudioEnded: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-md">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function severityClass(severity: string): string {
  if (severity === 'high') return 'border-rose-400/30 bg-rose-500/15 text-rose-300'
  if (severity === 'medium') return 'border-amber-400/30 bg-amber-500/15 text-amber-300'
  return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
}

function trendArrow(trend: string | null | undefined): string {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  return '→'
}

function trendColor(trend: string | null | undefined): string {
  if (trend === 'up') return 'text-emerald-400'
  if (trend === 'down') return 'text-rose-400'
  return 'text-slate-500'
}

function RiskRow({ risk }: { risk: ProjectRisk }) {
  return (
    <li className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-200">{risk.title}</p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${severityClass(
            risk.severity,
          )}`}
        >
          {risk.severity}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{risk.detail}</p>
      <p className="mt-2 text-xs text-slate-500">
        Owner: <span className="text-slate-300">{risk.owner}</span>
      </p>
    </li>
  )
}

export function IntelligenceWorkspace({
  userTranscript,
  response,
  intent,
  project,
  audioUrl,
  onAudioEnded,
}: IntelligenceWorkspaceProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Primary column — the conversational flow */}
      <div className="min-w-0 space-y-6">
        <TranscriptPanel transcript={userTranscript} />

        {response && (
          <ResponsePanel
            response={response}
            intent={intent}
            audioUrl={audioUrl}
            onAudioEnded={onAudioEnded}
          />
        )}

        {project && project.risks.length > 0 && (
          <Section title="Risks">
            <ul className="space-y-3">
              {project.risks.map((risk) => (
                <RiskRow key={risk.title} risk={risk} />
              ))}
            </ul>
          </Section>
        )}

        {project && project.actions.length > 0 && (
          <Section title="Recommended actions">
            <ul className="space-y-2">
              {project.actions.map((action) => (
                <li
                  key={action.title}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2.5"
                >
                  <p className="text-sm text-slate-200">{action.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {action.owner} · due {action.due}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Secondary rail — supporting project context */}
      <aside className="space-y-6">
        {project && project.metrics.length > 0 && (
          <Section title="Metrics">
            <ul className="grid grid-cols-2 gap-3">
              {project.metrics.map((metric) => (
                <li key={metric.label} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
                  <p className="text-xs text-slate-500">{metric.label}</p>
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold text-slate-100">{metric.value}</span>
                    <span className={`text-xs ${trendColor(metric.trend)}`}>
                      {trendArrow(metric.trend)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {project && project.sources.length > 0 && (
          <Section title="Sources">
            <ul className="space-y-2">
              {project.sources.map((source) => (
                <li
                  key={source.title}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-200">{source.title}</p>
                  <p className="text-xs text-slate-500">{source.detail}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {project && project.documents.length > 0 && (
          <Section title="Documents">
            <ul className="space-y-2">
              {project.documents.map((document) => (
                <li
                  key={document.title}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2"
                >
                  <p className="text-sm text-slate-200">{document.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {document.kind} · {document.updated}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </aside>
    </div>
  )
}
