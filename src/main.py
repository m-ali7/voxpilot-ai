from business_logic import get_context_for_intent
from conversation_memory import ConversationMemory
from intent_router import IntentRouter
from llm_client import LLMClient
from speech_to_text import SpeechToText
from voice_generator import VoiceGenerator


def build_enriched_prompt(detected_intent: str, user_prompt: str, business_context: str) -> str:
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
        "If the user asks for business data that has not been provided, say what information would be needed."
    )


def process_user_prompt(
    user_prompt: str,
    memory: ConversationMemory,
    router: IntentRouter,
    llm: LLMClient,
    voice: VoiceGenerator,
):
    detected_intent = router.classify(user_prompt)
    print(f"\nDetected Intent: {detected_intent}")

    business_context = get_context_for_intent(detected_intent)
    enriched_prompt = build_enriched_prompt(detected_intent, user_prompt, business_context)

    memory.add_user_message(enriched_prompt)

    print("\nGenerating AI response...")
    response_text = llm.generate_response(memory.get_messages())

    memory.add_assistant_message(response_text)

    print("\nVoxPilot:")
    print(response_text)

    print("\nGenerating voice response...")
    output_path = voice.generate_speech(response_text)

    print(f"Speech generated successfully: {output_path}")


def main():
    print("VoxPilot AI — Enterprise Voice Copilot")
    print("Choose input mode:")
    print("1. Type")
    print("2. Speak")
    print("Type 'exit' or 'quit' to end the conversation.")

    memory = ConversationMemory()
    router = IntentRouter()
    llm = LLMClient()
    voice = VoiceGenerator()
    stt = SpeechToText()

    while True:
        mode = input("\nInput mode [1=type, 2=speak]: ").strip()

        if mode.lower() in ["exit", "quit"]:
            print("\nEnding VoxPilot session.")
            break

        if mode == "1":
            user_prompt = input("\nYou: ").strip()

        elif mode == "2":
            user_prompt = stt.listen_and_transcribe(duration_seconds=5).strip()

        else:
            print("Please choose 1 or 2.")
            continue

        if user_prompt.lower() in ["exit", "quit"]:
            print("\nEnding VoxPilot session.")
            break

        if not user_prompt:
            print("No input detected.")
            continue

        process_user_prompt(user_prompt, memory, router, llm, voice)


if __name__ == "__main__":
    main()