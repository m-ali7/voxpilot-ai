from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProjectMetric:
    label: str
    value: str
    trend: str | None = None


@dataclass(frozen=True)
class ProjectRisk:
    title: str
    severity: str
    detail: str
    owner: str


@dataclass(frozen=True)
class ProjectAction:
    title: str
    owner: str
    due: str


@dataclass(frozen=True)
class ProjectDocument:
    title: str
    kind: str
    updated: str


@dataclass(frozen=True)
class SourceRef:
    title: str
    detail: str


@dataclass(frozen=True)
class ProjectIntelligence:
    """Structured project intelligence surfaced to the workspace.

    Returned by an integration connector (currently a demo implementation) and
    used both for LLM grounding and for the structured workspace UI.
    """

    project_id: str
    project_name: str
    status: str
    summary: str
    metrics: list[ProjectMetric] = field(default_factory=list)
    risks: list[ProjectRisk] = field(default_factory=list)
    actions: list[ProjectAction] = field(default_factory=list)
    documents: list[ProjectDocument] = field(default_factory=list)
    sources: list[SourceRef] = field(default_factory=list)
