from collections.abc import AsyncIterator
from typing import Any, cast

import anyio
from openai import AsyncOpenAI, OpenAI

from app.core.config import get_settings
from app.core.errors import ProviderError
from app.domain.ports import LLMPort

_SYSTEM_MESSAGE = {
    "role": "system",
    "content": (
        "You are VoxPilot AI, an enterprise voice copilot. "
        "Respond clearly, concisely and professionally. "
        "Your responses should sound natural when spoken aloud."
    ),
}

_DELTA_EVENT = "response.output_text.delta"


class OpenAILLMClient(LLMPort):
    def __init__(self) -> None:
        settings = get_settings()
        api_key = settings.openai_api_key_value
        self._client: OpenAI | None = OpenAI(api_key=api_key) if api_key else None
        self._async_client: AsyncOpenAI | None = AsyncOpenAI(api_key=api_key) if api_key else None
        self._model = settings.openai_model

    async def generate(self, conversation_history: list[dict[str, str]]) -> str:
        if not conversation_history:
            raise ValueError("Conversation history cannot be empty.")
        if self._client is None:
            raise ProviderError("OpenAI API key is not configured.")

        messages = [_SYSTEM_MESSAGE, *conversation_history]
        return await anyio.to_thread.run_sync(self._generate_sync, messages)

    async def generate_stream(
        self, conversation_history: list[dict[str, str]]
    ) -> AsyncIterator[str]:
        if not conversation_history:
            raise ValueError("Conversation history cannot be empty.")
        if self._async_client is None:
            raise ProviderError("OpenAI API key is not configured.")

        messages = [_SYSTEM_MESSAGE, *conversation_history]
        stream = await self._async_client.responses.create(
            model=self._model,
            input=cast(Any, messages),
            stream=True,
        )
        try:
            async for event in stream:
                if getattr(event, "type", "") == _DELTA_EVENT:
                    delta = getattr(event, "delta", "") or ""
                    if delta:
                        yield delta
        finally:
            close = getattr(stream, "close", None)
            if callable(close):
                try:
                    await close()
                except Exception:
                    pass

    def _generate_sync(self, messages: list[dict[str, str]]) -> str:
        assert self._client is not None
        # The SDK's `input` type is a broad union of message param types; our
        # {role, content} dicts are valid "easy input" messages at runtime.
        response = self._client.responses.create(
            model=self._model,
            input=cast(Any, messages),
        )
        return response.output_text
