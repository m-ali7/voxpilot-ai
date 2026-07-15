def get_executive_brief() -> str:
    return """
Executive Brief Data:
- Programme status: Amber
- Key achievement: Voice AI prototype successfully integrated with OpenAI and ElevenLabs.
- Main delivery concern: Real-time streaming is not yet implemented.
- Stakeholder priority: Demonstrate enterprise voice agent capability for AI-led client opportunities.
- Recommended next action: Complete business logic, and prepare a short demo script.
"""


def get_delivery_risks() -> str:
    return """
Delivery Risk Data:
- Risk 1: Voice input is not yet implemented, so the current experience is text-to-voice rather than full voice-to-voice.
- Risk 2: Real-time streaming is not yet implemented, which may increase perceived latency.
- Risk 3: The solution currently uses demo business data rather than live enterprise integrations.
- Mitigation 1: Add speech-to-text as the next capability.
- Mitigation 2: Introduce streaming responses after core functionality is stable.
- Mitigation 3: Position the current version as a modular MVP with clear enterprise extension points.
"""


def get_meeting_support() -> str:
    return """
Meeting Support Data:
- Meeting objective: Explain the Enterprise Voice Copilot architecture and demonstrate hands-on ElevenLabs experience.
- Key talking points:
  1. The solution separates reasoning, orchestration, business logic and voice generation.
  2. OpenAI is used for natural language generation.
  3. ElevenLabs is used as the voice synthesis layer.
  4. The architecture can be extended to enterprise systems such as Microsoft Graph, Azure DevOps, SharePoint, SQL and ServiceNow.
- Suggested closing point: The project demonstrates ability to rapidly learn a new AI platform and apply it within an enterprise architecture.
"""


def get_greeting_context() -> str:
    return """
Greeting Context:
The user has started a new interaction with VoxPilot AI. Respond warmly and briefly as an enterprise voice copilot.
"""


def get_context_for_intent(intent: str) -> str:
    if intent == "EXECUTIVE_BRIEF":
        return get_executive_brief()

    if intent == "DELIVERY_RISK":
        return get_delivery_risks()

    if intent == "MEETING":
        return get_meeting_support()

    if intent == "GREETING":
        return get_greeting_context()

    return ""