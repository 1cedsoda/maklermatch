"""Reply detection and sentiment classification."""

from __future__ import annotations

import re
from typing import Protocol


from .models import ReplySentiment


class LLMClient(Protocol):
    def generate(self, system_prompt: str, user_prompt: str) -> str: ...


SENTIMENT_PROMPT = """\
Klassifiziere diese Antwort eines Immobilienverkäufers auf Kleinanzeigen.
Die Antwort kam auf eine Erstansprache-Nachricht von uns.

Kategorien:
- positiv_offen: Freundlich, beantwortet die Frage, offen für Gespräch
- positiv_kurz: Kurze aber freundliche Antwort (z.B. "Ja", "Danke für die Info")
- neutral: Beantwortet die Frage ohne besondere Wärme oder Ablehnung
- negativ_ablehnend: Kein Interesse, höfliche Ablehnung
- negativ_aggressiv: Verärgert, Spam-Vorwurf, droht mit Meldung, beleidigend

Antworte NUR mit einer der Kategorien (z.B. "positiv_offen"), nichts weiter."""


# Quick keyword-based classification as fallback
_NEGATIVE_AGGRESSIVE_KEYWORDS = [
    "spam", "melden", "anzeige", "gemeldet", "nerv", "lass mich in ruhe",
    "hör auf", "blockiert", "blockiere", "belästigung", "abmahnung",
    "anwalt", "polizei", "strafanzeige", "unverschämt",
]
_NEGATIVE_POLITE_KEYWORDS = [
    "kein interesse", "nein danke", "nicht interessiert",
    "brauche keinen", "brauche keine", "bereits verkauft",
    "schon verkauft", "bitte keine", "keine weiteren",
]
_POSITIVE_KEYWORDS = [
    "danke", "interessant", "gute frage", "stimmt", "ja,",
    "erzähl", "erzählen sie", "gerne", "klar", "genau",
]


class OutcomeTracker:
    """Classifies reply sentiment and tracks conversation outcomes."""

    def __init__(self, llm_client: LLMClient | None = None):
        self._llm = llm_client

    def classify_reply(self, reply_text: str) -> ReplySentiment:
        """Classify the sentiment of a seller's reply.

        Uses LLM if available, falls back to keyword matching.
        """
        if self._llm:
            return self._classify_with_llm(reply_text)
        return self._classify_with_keywords(reply_text)

    def _classify_with_llm(self, reply_text: str) -> ReplySentiment:
        try:
            response = self._llm.generate(SENTIMENT_PROMPT, reply_text).strip().lower()

            mapping = {
                "positiv_offen": ReplySentiment.POSITIVE_OPEN,
                "positiv_kurz": ReplySentiment.POSITIVE_SHORT,
                "neutral": ReplySentiment.NEUTRAL,
                "negativ_ablehnend": ReplySentiment.NEGATIVE_POLITE,
                "negativ_aggressiv": ReplySentiment.NEGATIVE_AGGRESSIVE,
            }

            for key, sentiment in mapping.items():
                if key in response:
                    return sentiment

            # Fallback to keyword if LLM response doesn't match
            return self._classify_with_keywords(reply_text)
        except Exception:
            return self._classify_with_keywords(reply_text)

    def _classify_with_keywords(self, reply_text: str) -> ReplySentiment:
        text_lower = reply_text.lower()

        for kw in _NEGATIVE_AGGRESSIVE_KEYWORDS:
            if kw in text_lower:
                return ReplySentiment.NEGATIVE_AGGRESSIVE

        for kw in _NEGATIVE_POLITE_KEYWORDS:
            if kw in text_lower:
                return ReplySentiment.NEGATIVE_POLITE

        for kw in _POSITIVE_KEYWORDS:
            if kw in text_lower:
                # Short reply = POSITIVE_SHORT, longer = POSITIVE_OPEN
                if len(reply_text.split()) < 10:
                    return ReplySentiment.POSITIVE_SHORT
                return ReplySentiment.POSITIVE_OPEN

        # Default: neutral
        return ReplySentiment.NEUTRAL

    def is_positive(self, sentiment: ReplySentiment) -> bool:
        return sentiment in (ReplySentiment.POSITIVE_OPEN, ReplySentiment.POSITIVE_SHORT)

    def is_negative(self, sentiment: ReplySentiment) -> bool:
        return sentiment in (ReplySentiment.NEGATIVE_POLITE, ReplySentiment.NEGATIVE_AGGRESSIVE)

    def should_continue_outreach(self, sentiment: ReplySentiment) -> bool:
        """Whether to continue the conversation after this reply."""
        if self.is_negative(sentiment):
            return False
        return True
