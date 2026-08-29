from app.services.segmenter import SentenceSegmenter


def test_segments_on_sentence_punctuation() -> None:
    segmenter = SentenceSegmenter()
    assert segmenter.push("First sentence. Second sentence! Third?") == [
        "First sentence.",
        "Second sentence!",
        "Third?",
    ]


def test_keeps_partial_sentence_in_buffer() -> None:
    segmenter = SentenceSegmenter()
    assert segmenter.push("Unfinished sentence") == []
    assert segmenter.flush() == "Unfinished sentence"


def test_splits_across_multiple_pushes() -> None:
    segmenter = SentenceSegmenter()
    assert segmenter.push("Hello ") == []
    assert segmenter.push("world.") == ["Hello world."]


def test_flush_after_completed_segment_is_empty() -> None:
    segmenter = SentenceSegmenter()
    assert segmenter.push("Done. ") == ["Done."]
    assert segmenter.flush() == ""


def test_enforces_max_length_without_punctuation() -> None:
    segmenter = SentenceSegmenter(max_len=50)
    long_text = "word " * 30  # 150 chars, no punctuation
    segments = segmenter.push(long_text)
    assert segments
    assert all(len(s) <= 50 for s in segments)
    assert len(segmenter.flush()) < 50


def test_no_empty_segments() -> None:
    segmenter = SentenceSegmenter()
    assert segmenter.push("One. Two. Three.") == ["One.", "Two.", "Three."]
    assert segmenter.flush() == ""


def test_whitespace_only_produces_no_segments() -> None:
    segmenter = SentenceSegmenter()
    assert segmenter.push("   \n  ") == []
    assert segmenter.flush() == ""
