"""Selects the best personalization anchors and strategy for a listing."""

from __future__ import annotations

from .models import (
    DescriptionEffort,
    ListingSignals,
    MessageVariant,
    PersonalizationResult,
    PriceAssessment,
    SellerEmotion,
    Tone,
)


class PersonalizationEngine:
    """Analyzes ListingSignals and decides what to emphasize in the message."""

    def personalize(self, signals: ListingSignals) -> PersonalizationResult:
        primary_anchor = self._select_primary_anchor(signals)
        secondary_anchors = self._select_secondary_anchors(signals, primary_anchor)
        price_insight = self._build_price_insight(signals)
        emotional_hook = self._build_emotional_hook(signals)
        recommended_variants = self._rank_variants(signals)

        return PersonalizationResult(
            primary_anchor=primary_anchor,
            secondary_anchors=secondary_anchors,
            tone=signals.tone,
            recommended_variants=recommended_variants,
            price_insight=price_insight,
            emotional_hook=emotional_hook,
        )

    def _select_primary_anchor(self, s: ListingSignals) -> str:
        """Pick the ONE most distinctive feature to lead the message with.

        Priority:
        1. Unique architectural feature (proves genuine reading)
        2. Renovation detail (appreciates seller's investment)
        3. Lifestyle/emotional detail (connects personally)
        4. Price insight (shows expertise)
        5. Location insight (local knowledge)
        6. Basic property facts (fallback)
        """
        # 1. Unique features — pick the most specific one
        if s.unique_features:
            # Prefer features with more context (longer = more specific)
            ranked = sorted(s.unique_features, key=len, reverse=True)
            return ranked[0]

        # 2. Renovation history
        if s.renovation_history:
            return s.renovation_history

        # 3. Lifestyle signals combined with location
        if s.lifestyle_signals and s.location_quality_hints:
            return f"{s.location_quality_hints[0]} — {', '.join(s.lifestyle_signals[:2])}"

        # 4. Price discrepancy
        if s.price_assessment == PriceAssessment.BELOW_MARKET and s.price_per_sqm > 0:
            return f"{int(s.price_per_sqm)}€/m² in {s.city or s.plz}"

        # 5. Location quality
        if s.location_quality_hints:
            return s.location_quality_hints[0]

        # 6. Fallback: combine basic facts
        parts = []
        if s.wohnflaeche:
            parts.append(f"{int(s.wohnflaeche)}m²")
        if s.property_type:
            parts.append(s.property_type)
        if s.city:
            parts.append(f"in {s.city}")
        return " ".join(parts) if parts else s.title

    def _select_secondary_anchors(self, s: ListingSignals, primary: str) -> list[str]:
        """Pick 2-3 backup features for additional context."""
        candidates: list[str] = []

        for feature in s.unique_features:
            if feature != primary:
                candidates.append(feature)

        if s.renovation_history and s.renovation_history != primary:
            candidates.append(s.renovation_history)

        for hint in s.location_quality_hints:
            if hint != primary and hint not in candidates:
                candidates.append(hint)

        if s.grundstueck > 0:
            candidates.append(f"{int(s.grundstueck)}m² Grundstück")

        if s.lifestyle_signals:
            combined = ", ".join(s.lifestyle_signals[:3])
            if combined != primary:
                candidates.append(combined)

        return candidates[:3]

    def _build_price_insight(self, s: ListingSignals) -> str | None:
        """Build a price-related insight string if data is available."""
        if s.price_per_sqm <= 0:
            return None

        from .listing_analyzer import ListingAnalyzer
        analyzer = ListingAnalyzer()
        market_avg = analyzer.get_market_price(s.plz, s.property_type)

        if market_avg <= 0:
            return f"{int(s.price_per_sqm)}€/m²"

        diff_pct = ((s.price_per_sqm - market_avg) / market_avg) * 100

        if diff_pct < -25:
            return (
                f"{int(s.price_per_sqm)}€/m² — deutlich unter dem regionalen "
                f"Durchschnitt von ~{int(market_avg)}€/m²"
            )
        elif diff_pct < -10:
            return (
                f"{int(s.price_per_sqm)}€/m² — unter dem regionalen "
                f"Durchschnitt von ~{int(market_avg)}€/m²"
            )
        elif diff_pct > 25:
            return (
                f"{int(s.price_per_sqm)}€/m² — über dem regionalen "
                f"Durchschnitt von ~{int(market_avg)}€/m²"
            )
        else:
            return f"{int(s.price_per_sqm)}€/m² (Marktschnitt: ~{int(market_avg)}€/m²)"

    def _build_emotional_hook(self, s: ListingSignals) -> str | None:
        """Build a short emotional descriptor of the property."""
        parts: list[str] = []

        if s.title and any(w in s.title.lower() for w in ["familie", "traum", "paradies", "idylle"]):
            parts.append(s.title)

        if "Wald" in (s.location_quality_hints or []) or "Waldnähe" in (s.location_quality_hints or []):
            parts.append("am Wald")
        elif "ruhige Lage" in (s.location_quality_hints or []):
            parts.append("ruhige Lage")

        if "Familie" in s.lifestyle_signals or "Kinder" in s.lifestyle_signals:
            parts.append("Familienhaus")

        return " — ".join(parts) if parts else None

    def _rank_variants(self, s: ListingSignals) -> list[MessageVariant]:
        """Rank message variants by fit for this specific listing.

        Strategy mapping:
        - Rich description + unique features → A (Specific Observer)
        - Price below market → B (Market Insider)
        - Detailed description, proud seller → C (Empathetic Peer)
        - Strong location signals → D (Curious Neighbor)
        - Any listing (universal) → E (Quiet Expert)
        - Hidden value potential → F (Value Spotter)
        """
        scores: dict[MessageVariant, float] = {v: 0.0 for v in MessageVariant}

        # A: Specific Observer — needs unique features
        scores[MessageVariant.SPECIFIC_OBSERVER] += len(s.unique_features) * 2.0
        if s.description_effort == DescriptionEffort.HIGH:
            scores[MessageVariant.SPECIFIC_OBSERVER] += 1.0

        # B: Market Insider — needs price data
        if s.price_assessment == PriceAssessment.BELOW_MARKET:
            scores[MessageVariant.MARKET_INSIDER] += 4.0
        elif s.price_assessment == PriceAssessment.ABOVE_MARKET:
            scores[MessageVariant.MARKET_INSIDER] += 2.0
        if s.price_per_sqm > 0:
            scores[MessageVariant.MARKET_INSIDER] += 1.0

        # C: Empathetic Peer — works best with proud/detailed sellers
        if s.seller_emotion == SellerEmotion.PROUD:
            scores[MessageVariant.EMPATHETIC_PEER] += 3.0
        if s.description_effort == DescriptionEffort.HIGH:
            scores[MessageVariant.EMPATHETIC_PEER] += 2.0
        if s.is_vb:
            scores[MessageVariant.EMPATHETIC_PEER] += 1.0

        # D: Curious Neighbor — needs location signals
        scores[MessageVariant.CURIOUS_NEIGHBOR] += len(s.location_quality_hints) * 1.5
        if s.lifestyle_signals:
            scores[MessageVariant.CURIOUS_NEIGHBOR] += 1.0
        if s.grundstueck > 500:
            scores[MessageVariant.CURIOUS_NEIGHBOR] += 1.0

        # E: Quiet Expert — universal fallback, always viable
        scores[MessageVariant.QUIET_EXPERT] += 2.0  # Base score
        if s.is_vb:
            scores[MessageVariant.QUIET_EXPERT] += 1.0
        if s.price > 0 and s.wohnflaeche > 0:
            scores[MessageVariant.QUIET_EXPERT] += 1.0

        # F: Value Spotter — needs hidden potential
        hidden_value_keywords = [
            "einliegerwohnung", "teilbar", "ausbau", "dachgeschoss",
            "umbau", "potenzial", "möglich", "separater eingang",
        ]
        text_lower = s.raw_text.lower()
        for kw in hidden_value_keywords:
            if kw in text_lower:
                scores[MessageVariant.VALUE_SPOTTER] += 2.0

        if s.grundstueck > 0 and s.grundstueck > s.wohnflaeche * 3:
            scores[MessageVariant.VALUE_SPOTTER] += 1.5

        # Sort by score descending
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [variant for variant, _score in ranked]

    def get_personalization_depth(self, signals: ListingSignals) -> str:
        """Classify how much personalization material is available.

        Returns 'deep', 'medium', or 'shallow'.
        """
        anchor_count = (
            len(signals.unique_features)
            + (1 if signals.renovation_history else 0)
            + len(signals.location_quality_hints)
            + (1 if signals.price_assessment != PriceAssessment.UNKNOWN else 0)
        )

        if anchor_count >= 5:
            return "deep"
        elif anchor_count >= 2:
            return "medium"
        else:
            return "shallow"
