from dataclasses import dataclass

from app.domain.ports import BusinessContextPort, IntentClassifierPort, LLMPort


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
    business_context: str
    response: str


class Orchestrator:
    """Consolidated VoxPilot pipeline: intent -> context -> LLM response."""

    def __init__(
        self,
        intent_classifier: IntentClassifierPort,
        business_context: BusinessContextPort,
        llm: LLMPort,
    ) -> None:
        self._intent_classifier = intent_classifier
        self._business_context = business_context
        self._llm = llm

    async def run(self, user_prompt: str) -> OrchestrationResult:
        detected_intent = await self._intent_classifier.classify(user_prompt)
        business_context = await self._business_context.get_context(detected_intent)
        enriched_prompt = build_enriched_prompt(detected_intent, user_prompt, business_context)

        response = await self._llm.generate([{"role": "user", "content": enriched_prompt}])

        return OrchestrationResult(
            intent=detected_intent,
            business_context=business_context,
            response=response,
        )
