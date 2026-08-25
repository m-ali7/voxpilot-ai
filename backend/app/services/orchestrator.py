from dataclasses import dataclass

from app.domain.intelligence import ProjectIntelligence
from app.domain.ports import IntentClassifierPort, LLMPort, ProjectIntelligencePort


def format_project_intelligence(project: ProjectIntelligence) -> str:
    """Render structured project intelligence as grounded text for the LLM."""
    lines: list[str] = [
        f"Project: {project.project_name}",
        f"Status: {project.status}",
        f"Summary: {project.summary}",
    ]

    if project.metrics:
        lines.append("Metrics:")
        for metric in project.metrics:
            trend = f" ({metric.trend})" if metric.trend else ""
            lines.append(f"- {metric.label}: {metric.value}{trend}")

    if project.risks:
        lines.append("Risks:")
        for risk in project.risks:
            lines.append(
                f"- [{risk.severity}] {risk.title}: {risk.detail} (Owner: {risk.owner})"
            )

    if project.actions:
        lines.append("Actions:")
        for action in project.actions:
            lines.append(f"- {action.title} (Owner: {action.owner}, Due: {action.due})")

    if project.documents:
        lines.append("Documents:")
        for document in project.documents:
            lines.append(f"- {document.title} ({document.kind}, updated {document.updated})")

    return "\n".join(lines)


def build_enriched_prompt(
    detected_intent: str, user_prompt: str, business_context: str
) -> str:
    if business_context:
        return (
            f"Detected intent: {detected_intent}\n\n"
            f"Trusted business context:\n{business_context}\n\n"
            f"User request:\n{user_prompt}\n\n"
            "Use the trusted business context to answer the user. "
            "Do not invent facts outside the provided context. "
            "If the user refers to something from earlier in the conversation, "
            "resolve it using the conversation history. "
            "Keep the response concise and suitable to be spoken aloud."
        )

    return (
        f"Detected intent: {detected_intent}\n\n"
        f"User request:\n{user_prompt}\n\n"
        "Answer concisely and professionally. "
        "If the user asks for business data that has not been provided, "
        "say what information would be needed."
    )


@dataclass(frozen=True)
class OrchestrationResult:
    intent: str
    project: ProjectIntelligence
    response: str


class Orchestrator:
    """Consolidated VoxPilot pipeline: intent -> intelligence -> LLM response."""

    def __init__(
        self,
        intent_classifier: IntentClassifierPort,
        intelligence: ProjectIntelligencePort,
        llm: LLMPort,
    ) -> None:
        self._intent_classifier = intent_classifier
        self._intelligence = intelligence
        self._llm = llm

    async def run(
        self,
        user_prompt: str,
        prior_messages: list[dict[str, str]] | None = None,
    ) -> OrchestrationResult:
        detected_intent = await self._intent_classifier.classify(user_prompt)
        project = await self._intelligence.get_intelligence(user_prompt)
        context = format_project_intelligence(project)
        enriched_prompt = build_enriched_prompt(detected_intent, user_prompt, context)

        history = list(prior_messages or [])
        history.append({"role": "user", "content": enriched_prompt})
        response = await self._llm.generate(history)

        return OrchestrationResult(
            intent=detected_intent,
            project=project,
            response=response,
        )
