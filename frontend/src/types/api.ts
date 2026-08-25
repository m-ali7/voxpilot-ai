export interface Session {
  id: string
  tenant_id: string
  created_at: string
}

export interface ProjectMetric {
  label: string
  value: string
  trend?: string | null
}

export interface ProjectRisk {
  title: string
  severity: string
  detail: string
  owner: string
}

export interface ProjectAction {
  title: string
  owner: string
  due: string
}

export interface ProjectDocument {
  title: string
  kind: string
  updated: string
}

export interface SourceRef {
  title: string
  detail: string
}

export interface ProjectIntelligence {
  project_id: string
  project_name: string
  status: string
  summary: string
  metrics: ProjectMetric[]
  risks: ProjectRisk[]
  actions: ProjectAction[]
  documents: ProjectDocument[]
  sources: SourceRef[]
}

export interface Turn {
  intent: string
  response: string
  audio_url: string
  project: ProjectIntelligence
}

export interface TranscribeResult {
  text: string
}
