from pydantic import BaseModel


class ProjectMetricOut(BaseModel):
    label: str
    value: str
    trend: str | None = None


class ProjectRiskOut(BaseModel):
    title: str
    severity: str
    detail: str
    owner: str


class ProjectActionOut(BaseModel):
    title: str
    owner: str
    due: str


class ProjectDocumentOut(BaseModel):
    title: str
    kind: str
    updated: str


class SourceRefOut(BaseModel):
    title: str
    detail: str


class ProjectIntelligenceOut(BaseModel):
    project_id: str
    project_name: str
    status: str
    summary: str
    metrics: list[ProjectMetricOut]
    risks: list[ProjectRiskOut]
    actions: list[ProjectActionOut]
    documents: list[ProjectDocumentOut]
    sources: list[SourceRefOut]
