"""Sentence/phrase segmentation for sentence-buffered streaming TTS."""

_SENTENCE_END = ".!?\u2026"  # . ! ? …
_WHITESPACE = " \n\t"


class SentenceSegmenter:
    """Accumulate streamed text and yield complete, speakable segments.

    Splits on sentence-ending punctuation (followed by whitespace) and enforces
    a maximum segment length so long punctuation-free output does not block
    speech indefinitely.
    """

    def __init__(self, max_len: int = 280) -> None:
        self._max_len = max_len
        self._buffer = ""

    def push(self, delta: str) -> list[str]:
        self._buffer += delta
        segments: list[str] = []
        while True:
            boundary = self._next_boundary()
            if boundary is None:
                break
            segment = self._buffer[:boundary].strip()
            self._buffer = self._buffer[boundary:]
            if segment:
                segments.append(segment)
        return segments

    def flush(self) -> str:
        remaining = self._buffer.strip()
        self._buffer = ""
        return remaining

    def _next_boundary(self) -> int | None:
        for i, ch in enumerate(self._buffer):
            if ch in _SENTENCE_END:
                j = i + 1
                while j < len(self._buffer) and self._buffer[j] in _WHITESPACE:
                    j += 1
                return j
        if len(self._buffer) >= self._max_len:
            cut = self._buffer.rfind(" ", 0, self._max_len)
            if cut <= 0:
                cut = self._max_len
            return cut
        return None
