from app.domain.intelligence import (
    ProjectAction,
    ProjectDocument,
    ProjectIntelligence,
    ProjectMetric,
    ProjectRisk,
    SourceRef,
)
from app.domain.ports import ProjectIntelligencePort


class DemoProjectConnector(ProjectIntelligencePort):
    """Simulated enterprise project connector.

    Returns static, clearly-labelled demo data for a single "Project Phoenix"
    delivery programme. This stands in for real connectors (Azure DevOps,
    ServiceNow, SharePoint, Confluence, Power BI) and is replaced in a later
    phase without changing the port or the rest of the pipeline.
    """

    PROJECT_ID = "phoenix"
    PROJECT_NAME = "Project Phoenix"

    async def get_intelligence(self, query: str = "") -> ProjectIntelligence:
        return ProjectIntelligence(
            project_id=self.PROJECT_ID,
            project_name=self.PROJECT_NAME,
            status="Amber",
            summary=(
                "Project Phoenix is an enterprise voice copilot programme delivering "
                "an AI-led assistant for executive briefings, delivery risk analysis and "
                "workflow intelligence. The programme is currently rated Amber with "
                "real-time streaming still outstanding."
            ),
            metrics=[
                ProjectMetric(label="Programme health", value="Amber", trend="flat"),
                ProjectMetric(label="Sprint velocity", value="34 pts", trend="up"),
                ProjectMetric(label="On-time delivery", value="87%", trend="down"),
                ProjectMetric(label="Open incidents", value="3", trend="flat"),
                ProjectMetric(label="Budget utilisation", value="62%", trend="flat"),
            ],
            risks=[
                ProjectRisk(
                    title="Real-time streaming not yet implemented",
                    severity="high",
                    detail=(
                        "Voice responses are currently generated non-streaming, "
                        "increasing perceived latency."
                    ),
                    owner="Alex Chen",
                ),
                ProjectRisk(
                    title="No live enterprise integrations",
                    severity="high",
                    detail=(
                        "The solution still runs on demo data rather than live "
                        "Azure DevOps or ServiceNow feeds."
                    ),
                    owner="Marcus Webb",
                ),
                ProjectRisk(
                    title="Voice input latency may degrade UX",
                    severity="medium",
                    detail="End-to-end speech-to-speech latency has not been measured under load.",
                    owner="Priya Nair",
                ),
                ProjectRisk(
                    title="Voice consistency across languages",
                    severity="low",
                    detail=(
                        "ElevenLabs multilingual voice quality needs validation "
                        "for non-English briefings."
                    ),
                    owner="Sofia Ruiz",
                ),
            ],
            actions=[
                ProjectAction(
                    title="Complete speech-to-text integration",
                    owner="Alex Chen",
                    due="This week",
                ),
                ProjectAction(
                    title="Introduce streaming responses",
                    owner="Priya Nair",
                    due="Next sprint",
                ),
                ProjectAction(
                    title="Prepare client demo script",
                    owner="Marcus Webb",
                    due="Friday",
                ),
            ],
            documents=[
                ProjectDocument(title="Programme brief — Q3", kind="PDF", updated="2 days ago"),
                ProjectDocument(title="Delivery risk register", kind="Sheet", updated="1 day ago"),
                ProjectDocument(
                    title="Architecture overview", kind="Confluence", updated="5 days ago"
                ),
                ProjectDocument(
                    title="Voice agent demo script", kind="Doc", updated="3 days ago"
                ),
            ],
            sources=[
                SourceRef(title="Azure DevOps", detail="Delivery status and sprint metrics"),
                SourceRef(title="ServiceNow", detail="Incident and risk data"),
                SourceRef(title="SharePoint", detail="Programme documentation"),
            ],
        )
