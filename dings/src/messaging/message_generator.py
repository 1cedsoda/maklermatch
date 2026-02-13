"""LLM-based message generation with constraint enforcement."""

from __future__ import annotations

import hashlib
import logging
from typing import Protocol

from .config import MAX_GENERATION_RETRIES
from .listing_analyzer import ListingAnalyzer
from .models import (
    FollowUpStage,
    ListingSignals,
    Message,
    MessageVariant,
)
from .personalization import PersonalizationEngine
from .spam_guard import SpamGuard
from .templates import build_followup_prompt, build_generation_prompt

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM clients used by the generator."""

    def generate(self, system_prompt: str, user_prompt: str) -> str: ...


class MessageGenerator:
    """Generates personalized messages for Kleinanzeigen listings.

    Full pipeline: analyze listing → personalize → generate via LLM → validate.
    """

    def __init__(self, llm_client: LLMClient):
        self._llm = llm_client
        self._analyzer = ListingAnalyzer()
        self._personalizer = PersonalizationEngine()
        self._spam_guard = SpamGuard(llm_client=llm_client)
        self._sent_hashes: set[str] = set()

    def generate(
        self,
        raw_listing_text: str,
        listing_id: str = "",
        listing_url: str = "",
        variant: MessageVariant | None = None,
    ) -> Message:
        """Generate a personalized initial message for a listing.

        Args:
            raw_listing_text: The full text content of the listing.
            listing_id: Optional ID for tracking.
            listing_url: Optional URL for tracking.
            variant: Force a specific variant, or None to auto-select best fit.

        Returns:
            A validated Message ready to send.

        Raises:
            MessageGenerationError: If generation fails after all retries.
        """
        # Step 1: Analyze listing
        signals = self._analyzer.analyze(raw_listing_text, listing_id, listing_url)

        # Step 2: Personalize
        personalization = self._personalizer.personalize(signals)

        # Step 3: Select variant
        if variant is None:
            variant = personalization.recommended_variants[0]

        # Step 4: Generate + validate (with retries)
        return self._generate_with_retries(signals, personalization, variant)

    def generate_all_variants(
        self,
        raw_listing_text: str,
        listing_id: str = "",
        listing_url: str = "",
    ) -> dict[MessageVariant, Message]:
        """Generate messages for all 6 variants (useful for review/testing).

        Returns a dict of variant -> Message. Variants that fail validation
        after all retries are excluded.
        """
        signals = self._analyzer.analyze(raw_listing_text, listing_id, listing_url)
        personalization = self._personalizer.personalize(signals)

        results: dict[MessageVariant, Message] = {}
        for v in MessageVariant:
            try:
                msg = self._generate_with_retries(signals, personalization, v)
                results[v] = msg
            except MessageGenerationError:
                logger.warning("Variant %s failed all retries for listing %s", v.name, listing_id)

        return results

    def generate_followup(
        self,
        raw_listing_text: str,
        stage: FollowUpStage,
        listing_id: str = "",
        listing_url: str = "",
    ) -> Message:
        """Generate a follow-up message.

        Args:
            raw_listing_text: The full listing text (same as initial).
            stage: FOLLOWUP_1 or FOLLOWUP_2.
            listing_id: For tracking.
            listing_url: For tracking.

        Returns:
            A validated follow-up Message.
        """
        if stage not in (FollowUpStage.FOLLOWUP_1, FollowUpStage.FOLLOWUP_2):
            raise ValueError(f"Invalid follow-up stage: {stage}")

        signals = self._analyzer.analyze(raw_listing_text, listing_id, listing_url)
        stage_num = 1 if stage == FollowUpStage.FOLLOWUP_1 else 2

        system_prompt, user_prompt = build_followup_prompt(signals, stage_num)

        for attempt in range(1, MAX_GENERATION_RETRIES + 2):
            raw_message = self._llm.generate(system_prompt, user_prompt).strip()
            raw_message = self._clean_message(raw_message)

            # Follow-ups have relaxed validation (no personalization check needed)
            validation = self._spam_guard.validate(raw_message, signals)

            if validation.passed and not self._is_duplicate(raw_message):
                self._sent_hashes.add(self._hash(raw_message))
                return Message(
                    text=raw_message,
                    variant=MessageVariant.SPECIFIC_OBSERVER,  # Not relevant for follow-ups
                    listing_id=listing_id,
                    listing_url=listing_url,
                    spam_guard_score=validation.score,
                    generation_attempt=attempt,
                    stage=stage,
                )

            if attempt <= MAX_GENERATION_RETRIES:
                # Add rejection feedback to prompt for next attempt
                user_prompt = (
                    user_prompt
                    + f"\n\nVORHERIGER VERSUCH ABGELEHNT: {validation.rejection_reason}"
                    + "\nBitte korrigiere diese Probleme."
                )
                logger.info(
                    "Follow-up attempt %d rejected: %s",
                    attempt,
                    validation.rejection_reason,
                )

        raise MessageGenerationError(
            f"Follow-up generation failed after {MAX_GENERATION_RETRIES + 1} attempts"
        )

    def analyze_listing(self, raw_listing_text: str) -> ListingSignals:
        """Expose the analyzer for external use (e.g., debugging)."""
        return self._analyzer.analyze(raw_listing_text)

    def _generate_with_retries(
        self,
        signals: ListingSignals,
        personalization,
        variant: MessageVariant,
    ) -> Message:
        system_prompt, user_prompt = build_generation_prompt(
            signals, personalization, variant
        )

        for attempt in range(1, MAX_GENERATION_RETRIES + 2):
            raw_message = self._llm.generate(system_prompt, user_prompt).strip()
            raw_message = self._clean_message(raw_message)

            validation = self._spam_guard.validate(raw_message, signals)

            if validation.passed and not self._is_duplicate(raw_message):
                self._sent_hashes.add(self._hash(raw_message))
                return Message(
                    text=raw_message,
                    variant=variant,
                    listing_id=signals.listing_id,
                    listing_url=signals.listing_url,
                    spam_guard_score=validation.score,
                    generation_attempt=attempt,
                )

            if attempt <= MAX_GENERATION_RETRIES:
                user_prompt = (
                    user_prompt
                    + f"\n\nVORHERIGER VERSUCH ABGELEHNT: {validation.rejection_reason}"
                    + "\nBitte korrigiere diese Probleme."
                )
                logger.info(
                    "Variant %s attempt %d rejected: %s",
                    variant.name,
                    attempt,
                    validation.rejection_reason,
                )

        raise MessageGenerationError(
            f"Variant {variant.name} failed after {MAX_GENERATION_RETRIES + 1} attempts "
            f"for listing {signals.listing_id}"
        )

    def _clean_message(self, text: str) -> str:
        """Remove LLM artifacts like quotes, prefixes, etc."""
        # Remove surrounding quotes
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        if text.startswith("'") and text.endswith("'"):
            text = text[1:-1]
        # Remove common LLM preambles
        prefixes_to_strip = [
            "Hier ist die Nachricht:",
            "Nachricht:",
            "Hier ist mein Vorschlag:",
        ]
        for prefix in prefixes_to_strip:
            if text.startswith(prefix):
                text = text[len(prefix):].strip()
        return text.strip()

    def _hash(self, message: str) -> str:
        normalized = " ".join(message.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]

    def _is_duplicate(self, message: str) -> bool:
        return self._hash(message) in self._sent_hashes


class MessageGenerationError(Exception):
    """Raised when message generation fails after all retries."""
