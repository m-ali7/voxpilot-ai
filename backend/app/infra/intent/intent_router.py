from app.domain.ports import IntentClassifierPort


class IntentRouter(IntentClassifierPort):
    """Keyword-based intent classifier (parity with the existing prototype).

    This is a placeholder for the LLM-based classifier planned for Phase 1.
    """

    async def classify(self, user_prompt: str) -> str:
        prompt = user_prompt.lower()

        if any(word in prompt for word in ["brief", "summary", "summarise", "summarize"]):
            return "EXECUTIVE_BRIEF"

        if any(word in prompt for word in ["risk", "issue", "problem", "incident"]):
            return "DELIVERY_RISK"

        if any(word in prompt for word in ["meeting", "calendar", "schedule"]):
            return "MEETING"

        if any(word in prompt for word in ["hello", "hi", "hey", "good morning"]):
            return "GREETING"

        return "GENERAL"
