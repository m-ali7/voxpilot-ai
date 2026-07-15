class IntentRouter:

    def classify(self, user_prompt: str) -> str:

        prompt = user_prompt.lower()

        if any(word in prompt for word in [
            "brief",
            "summary",
            "summarise",
            "summarize",
        ]):
            return "EXECUTIVE_BRIEF"

        if any(word in prompt for word in [
            "risk",
            "issue",
            "problem",
            "incident",
        ]):
            return "DELIVERY_RISK"

        if any(word in prompt for word in [
            "meeting",
            "calendar",
            "schedule",
        ]):
            return "MEETING"

        if any(word in prompt for word in [
            "hello",
            "hi",
            "hey",
            "good morning",
        ]):
            return "GREETING"

        return "GENERAL"