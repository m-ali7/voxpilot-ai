import sys
from pathlib import Path

import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parent
SRC_DIR = PROJECT_ROOT / "src"
sys.path.append(str(SRC_DIR))

from business_logic import get_context_for_intent
from intent_router import IntentRouter
from llm_client import LLMClient
from speech_to_text import SpeechToText
from voice_generator import VoiceGenerator


def inject_css():
    st.markdown(
        """
        <style>
        .main {
            background: #050B14;
        }

        .block-container {
            padding-top: 3rem;
            padding-bottom: 3rem;
            max-width: 1200px;
        }

        .hero-card {
            padding: 2rem;
            border-radius: 24px;
            background: linear-gradient(135deg, rgba(23, 37, 84, 0.85), rgba(15, 23, 42, 0.95));
            border: 1px solid rgba(96, 165, 250, 0.25);
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
            margin-bottom: 1.5rem;
        }

        .hero-title {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 0.4rem;
            color: #F8FAFC;
        }

        .hero-subtitle {
            font-size: 1.05rem;
            color: #CBD5E1;
            max-width: 760px;
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .status-card {
            padding: 1rem;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(148, 163, 184, 0.18);
        }

        .status-label {
            font-size: 0.8rem;
            color: #94A3B8;
            margin-bottom: 0.25rem;
        }

        .status-value {
            font-size: 1rem;
            color: #E2E8F0;
            font-weight: 700;
        }

        .panel {
            padding: 1.3rem;
            border-radius: 20px;
            background: rgba(15, 23, 42, 0.88);
            border: 1px solid rgba(148, 163, 184, 0.16);
            margin-bottom: 1rem;
        }

        .intent-pill {
            display: inline-block;
            padding: 0.45rem 0.8rem;
            border-radius: 999px;
            background: rgba(59, 130, 246, 0.16);
            border: 1px solid rgba(96, 165, 250, 0.35);
            color: #BFDBFE;
            font-weight: 700;
            letter-spacing: 0.03em;
        }

        .small-muted {
            color: #94A3B8;
            font-size: 0.9rem;
        }

        section[data-testid="stSidebar"] {
            background: #0F172A;
            border-right: 1px solid rgba(148, 163, 184, 0.16);
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


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


def process_prompt(user_prompt: str):
    router = IntentRouter()
    llm = LLMClient()
    voice = VoiceGenerator()

    detected_intent = router.classify(user_prompt)
    business_context = get_context_for_intent(detected_intent)

    enriched_prompt = build_enriched_prompt(
        detected_intent,
        user_prompt,
        business_context,
    )

    response_text = llm.generate_response([
        {"role": "user", "content": enriched_prompt}
    ])

    output_path = voice.generate_speech(response_text)

    return detected_intent, business_context, response_text, output_path


st.set_page_config(
    page_title="VoxPilot AI",
    page_icon="🎙️",
    layout="wide",
)

inject_css()

with st.sidebar:
    st.markdown("## 🎙️ VoxPilot AI")
    st.caption("Enterprise Voice Copilot")

    st.markdown("---")
    st.markdown("### Architecture")
    st.markdown("🎤 Speech/Text Input")
    st.markdown("↓")
    st.markdown("🧠 Intent Router")
    st.markdown("↓")
    st.markdown("⚙️ Business Logic")
    st.markdown("↓")
    st.markdown("🤖 OpenAI")
    st.markdown("↓")
    st.markdown("🗣️ ElevenLabs Voice Output")

    st.markdown("---")
    st.markdown("### Demo Prompts")
    st.markdown("- Give me a short executive brief")
    st.markdown("- What are the key delivery risks?")
    st.markdown("- Help me prepare for a meeting about this project")

st.markdown(
    """
    <div class="hero-card">
        <div class="hero-title">🎙️ VoxPilot AI</div>
        <div class="hero-subtitle">
            Enterprise voice copilot for executive briefings, delivery risk analysis and workflow intelligence.
            Built with modular orchestration, trusted business context, OpenAI and ElevenLabs.
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="status-grid">
        <div class="status-card">
            <div class="status-label">System Status</div>
            <div class="status-value">🟢 Online</div>
        </div>
        <div class="status-card">
            <div class="status-label">Input Modes</div>
            <div class="status-value">Text + Voice</div>
        </div>
        <div class="status-card">
            <div class="status-label">Reasoning Layer</div>
            <div class="status-value">OpenAI</div>
        </div>
        <div class="status-card">
            <div class="status-label">Voice Layer</div>
            <div class="status-value">ElevenLabs</div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

input_mode = st.radio(
    "Choose input mode",
    ["Type request", "Speak request"],
    horizontal=True,
)

user_prompt = ""

if input_mode == "Type request":
    user_prompt = st.text_area(
        "Request",
        placeholder="Example: Give me a short executive brief",
        height=120,
    )

    run_button = st.button("Generate Voice Briefing", type="primary")

else:
    st.info("Click record, speak for up to 5 seconds, then VoxPilot will transcribe and process your request.")
    run_button = st.button("🎙️ Record 5 Seconds & Generate", type="primary")

    if run_button:
        with st.spinner("Recording and transcribing..."):
            stt = SpeechToText()
            user_prompt = stt.listen_and_transcribe(duration_seconds=5)

if run_button:
    if not user_prompt.strip():
        st.warning("Please enter or record a request first.")
    else:
        with st.spinner("Processing through VoxPilot pipeline..."):
            detected_intent, business_context, response_text, output_path = process_prompt(user_prompt)

        left, right = st.columns([1, 1])

        with left:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            st.subheader("User Transcript")
            st.write(user_prompt)

            st.subheader("Detected Intent")
            st.markdown(f'<span class="intent-pill">{detected_intent}</span>', unsafe_allow_html=True)

            st.subheader("Trusted Business Context")
            st.text(business_context if business_context else "No specific business context found.")
            st.markdown("</div>", unsafe_allow_html=True)

        with right:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            st.subheader("AI Response")
            st.write(response_text)

            st.subheader("Voice Output")
            st.audio(str(output_path))
            st.markdown("</div>", unsafe_allow_html=True)