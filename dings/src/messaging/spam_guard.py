"""Validates generated messages against anti-spam rules and quality checks."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .config import (
    FORBIDDEN_OPENERS,
    FORBIDDEN_PHRASES,
    FORBIDDEN_WORDS,
    MAX_EXCLAMATION_MARKS,
    MAX_QUESTION_MARKS,
    MAX_WORDS,
    MIN_QUALITY_SCORE,
)
from .models import ListingSignals


@dataclass
class ValidationResult:
    passed: bool
    score: int = 0  # 1-10 quality score from LLM
    rejection_reasons: list[str] | None = None

    @property
    def rejection_reason(self) -> str:
        if self.rejection_reasons:
            return "; ".join(self.rejection_reasons)
        return ""


class SpamGuard:
    """Two-layer validation: rule-based checks + LLM quality scoring."""

    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: An object with a `generate(system_prompt, user_prompt) -> str`
                method. If None, LLM quality check is skipped.
        """
        self._llm = llm_client

    def validate(self, message: str, signals: ListingSignals) -> ValidationResult:
        """Run all validation checks on a generated message."""
        reasons: list[str] = []

        # Layer 1: Rule-based checks
        reasons.extend(self._check_forbidden_words(message))
        reasons.extend(self._check_forbidden_phrases(message))
        reasons.extend(self._check_forbidden_openers(message))
        reasons.extend(self._check_structure(message))
        reasons.extend(self._check_personalization(message, signals))
        reasons.extend(self._check_self_focus(message))

        if reasons:
            return ValidationResult(passed=False, score=0, rejection_reasons=reasons)

        # Layer 2: LLM quality check (if client available)
        if self._llm:
            score = self._llm_quality_check(message)
            if score < MIN_QUALITY_SCORE:
                return ValidationResult(
                    passed=False,
                    score=score,
                    rejection_reasons=[
                        f"LLM-Qualitätsscore {score}/10 — unter Minimum von {MIN_QUALITY_SCORE}"
                    ],
                )
            return ValidationResult(passed=True, score=score)

        return ValidationResult(passed=True, score=0)

    def _check_forbidden_words(self, message: str) -> list[str]:
        reasons = []
        msg_lower = message.lower()
        for word in FORBIDDEN_WORDS:
            if word.lower() in msg_lower:
                reasons.append(f"Verbotenes Wort: '{word}'")
        return reasons

    def _check_forbidden_phrases(self, message: str) -> list[str]:
        reasons = []
        msg_lower = message.lower()
        for phrase in FORBIDDEN_PHRASES:
            if phrase.lower() in msg_lower:
                reasons.append(f"Verbotene Phrase: '{phrase}'")
        return reasons

    def _check_forbidden_openers(self, message: str) -> list[str]:
        stripped = message.strip()
        for opener in FORBIDDEN_OPENERS:
            if stripped.startswith(opener):
                return [f"Verbotener Anfang: '{opener}...'"]
        return []

    def _check_structure(self, message: str) -> list[str]:
        reasons = []
        word_count = len(message.split())

        if word_count > MAX_WORDS:
            reasons.append(f"Zu lang: {word_count} Wörter (max {MAX_WORDS})")

        excl_count = message.count("!")
        if excl_count > MAX_EXCLAMATION_MARKS:
            reasons.append(
                f"Zu viele Ausrufezeichen: {excl_count} (max {MAX_EXCLAMATION_MARKS})"
            )

        question_count = message.count("?")
        if question_count > MAX_QUESTION_MARKS:
            reasons.append(
                f"Zu viele Fragezeichen: {question_count} (max {MAX_QUESTION_MARKS})"
            )

        if question_count == 0:
            reasons.append("Kein Fragezeichen — Nachricht braucht genau einen CTA")

        if not message.rstrip().endswith("?"):
            reasons.append("Nachricht muss mit einer Frage enden")

        # Check for URLs
        if re.search(r"https?://|www\.", message, re.IGNORECASE):
            reasons.append("Enthält URL — nicht erlaubt")

        # Check for greeting at end
        greeting_endings = [
            "viele grüße", "liebe grüße", "mit freundlichen grüßen",
            "mfg", "lg", "beste grüße", "herzliche grüße",
        ]
        msg_lower = message.lower().rstrip().rstrip("?").rstrip()
        for greeting in greeting_endings:
            if greeting in msg_lower[-50:]:
                reasons.append(f"Grußformel am Ende: '{greeting}'")

        return reasons

    def _check_personalization(self, message: str, signals: ListingSignals) -> list[str]:
        """Verify the message contains at least one specific detail from the listing."""
        msg_lower = message.lower()

        # Check if any unique feature is mentioned
        for feature in signals.unique_features[:5]:
            # Check individual words from the feature (at least 1 distinctive word)
            words = [w for w in feature.split() if len(w) > 4]
            if any(w.lower() in msg_lower for w in words):
                return []

        # Check if price is mentioned
        if signals.price and str(signals.price) in message.replace(".", ""):
            return []

        # Check if price in formatted form (385.000) is mentioned
        if signals.price:
            formatted = f"{signals.price:,}".replace(",", ".")
            if formatted in message:
                return []

        # Check if city is mentioned
        if signals.city and signals.city.lower() in msg_lower:
            return []

        # Check if PLZ is mentioned
        if signals.plz and signals.plz in message:
            return []

        # Check if wohnfläche is mentioned
        if signals.wohnflaeche and str(int(signals.wohnflaeche)) in message:
            return []

        # Check if grundstück is mentioned
        if signals.grundstueck and str(int(signals.grundstueck)) in message:
            return []

        return ["Keine Personalisierung — kein spezifisches Detail aus der Anzeige gefunden"]

    def _check_self_focus(self, message: str) -> list[str]:
        """Check if the message starts too self-focused."""
        first_50 = message.strip()[:50].lower()
        # Count first-person references in first 50 chars
        self_words = re.findall(r"\b(ich|mein|mir|mich|meine|meinem|meinen|meiner)\b", first_50)
        if len(self_words) >= 2:
            return ["Zu viel Ich-Fokus am Anfang — beginne mit der Immobilie, nicht mit dir"]
        return []

    def _llm_quality_check(self, message: str) -> int:
        """Score the message 1-10 from a seller's perspective using LLM."""
        system_prompt = """\
Du bist ein privater Immobilienverkäufer auf Kleinanzeigen. Du bekommst täglich \
30-50 Nachrichten, davon 80% Lowball-Angebote und Spam von Maklern.

Bewerte diese Nachricht auf einer Skala von 1-10:
- 1-3: Offensichtlicher Spam/Makler, würde ich ignorieren
- 4-5: Unklar, wahrscheinlich ignorieren
- 6-7: Interessant, könnte antworten
- 8-10: Würde definitiv antworten, fühlt sich echt an

Antworte NUR mit der Zahl (1-10), nichts weiter."""

        try:
            response = self._llm.generate(system_prompt, message)
            # Extract the first number from the response
            match = re.search(r"\b(\d+)\b", response.strip())
            if match:
                score = int(match.group(1))
                return max(1, min(10, score))
            return 5  # Default if parsing fails
        except Exception:
            return 5  # Default on error — don't block message
