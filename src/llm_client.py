from openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_MODEL


class LLMClient:
    def __init__(self):
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = OPENAI_MODEL

    def generate_response(self, conversation_history: list[dict]) -> str:
        if not conversation_history:
            raise ValueError("Conversation history cannot be empty.")

        system_message = {
            "role": "system",
            "content": (
                "You are VoxPilot AI, an enterprise voice copilot. "
                "Respond clearly, concisely and professionally. "
                "Your responses should sound natural when spoken aloud."
            ),
        }

        response = self.client.responses.create(
            model=self.model,
            input=[system_message] + conversation_history,
        )

        return response.output_text