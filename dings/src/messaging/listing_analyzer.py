"""Extracts structured signals from raw Kleinanzeigen listing data."""

from __future__ import annotations

import json
import re
from pathlib import Path

from .config import (
    FORMAL_MARKERS,
    INFORMAL_MARKERS,
    LIFESTYLE_KEYWORDS,
    RENOVATION_KEYWORDS,
    UNIQUE_FEATURE_KEYWORDS,
    URGENCY_KEYWORDS,
)
from .models import (
    DescriptionEffort,
    ListingSignals,
    PriceAssessment,
    SellerEmotion,
    Tone,
)

# Load market prices once at import time
_MARKET_PRICES_PATH = Path(__file__).parent.parent.parent / "data" / "market_prices.json"
_MARKET_PRICES: dict = {}
if _MARKET_PRICES_PATH.exists():
    with open(_MARKET_PRICES_PATH) as f:
        _MARKET_PRICES = json.load(f)


class ListingAnalyzer:
    """Parses raw listing text into structured ListingSignals."""

    def analyze(self, raw_text: str, listing_id: str = "", listing_url: str = "") -> ListingSignals:
        signals = ListingSignals(
            raw_text=raw_text,
            listing_id=listing_id,
            listing_url=listing_url,
        )

        self._extract_title(signals)
        self._extract_price(signals)
        self._extract_property_details(signals)
        self._extract_location(signals)
        self._extract_features(signals)
        self._extract_renovation(signals)
        self._extract_lifestyle(signals)
        self._extract_amenities(signals)
        self._assess_price(signals)
        self._detect_seller_psychology(signals)
        self._detect_tone(signals)

        return signals

    def _extract_title(self, s: ListingSignals) -> None:
        lines = s.raw_text.strip().split("\n")
        if lines:
            s.title = lines[0].strip()
            # Detect property type from title and content
            text_lower = s.raw_text.lower()
            if any(w in text_lower for w in ["haus", "einfamilienhaus", "doppelhaushälfte", "reihenhaus", "bungalow", "villa"]):
                s.property_type = "Haus"
            elif any(w in text_lower for w in ["wohnung", "eigentumswohnung", "apartment", "penthouse", "maisonette"]):
                s.property_type = "Wohnung"
            elif any(w in text_lower for w in ["grundstück", "baugrundstück", "bauland"]):
                s.property_type = "Grundstück"
            elif "mehrfamilienhaus" in text_lower:
                s.property_type = "Mehrfamilienhaus"
            else:
                s.property_type = "Immobilie"

    def _extract_price(self, s: ListingSignals) -> None:
        # Match patterns like "385.000 €", "385.000€", "385000 EUR", "385.000 € VB"
        price_match = re.search(
            r"(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(?:€|EUR)",
            s.raw_text,
        )
        if price_match:
            price_str = price_match.group(1).replace(".", "").replace(",", ".")
            s.price = int(float(price_str))

        s.is_vb = bool(re.search(r"\bVB\b|Verhandlungsbasis", s.raw_text, re.IGNORECASE))

        # Provision
        provision_lower = s.raw_text.lower()
        if "keine" in provision_lower and "provision" in provision_lower:
            s.provision = "keine"
            s.has_provision_note = True
        elif "provision" in provision_lower or "courtage" in provision_lower:
            s.has_provision_note = True
            s.provision = "vorhanden"

    def _extract_property_details(self, s: ListingSignals) -> None:
        text = s.raw_text

        # Wohnfläche
        wf_match = re.search(r"(?:Wohnfläche|Wohnfl)\s*[\n:]*\s*(\d+(?:[,\.]\d+)?)\s*m", text, re.IGNORECASE)
        if wf_match:
            s.wohnflaeche = float(wf_match.group(1).replace(",", "."))

        # Grundstücksfläche
        gf_match = re.search(r"(?:Grundstücks?fläche|Grundst)\s*[\n:]*\s*(\d+(?:[,\.]\d+)?)\s*m", text, re.IGNORECASE)
        if gf_match:
            s.grundstueck = float(gf_match.group(1).replace(",", "."))

        # Zimmer
        zi_match = re.search(r"Zimmer\s*[\n:]*\s*(\d+(?:[,\.]\d+)?)", text, re.IGNORECASE)
        if zi_match:
            s.zimmer = int(float(zi_match.group(1).replace(",", ".")))

        # Baujahr
        bj_match = re.search(r"Baujahr\s*[\n:]*\s*(\d{4})", text, re.IGNORECASE)
        if bj_match:
            s.baujahr = int(bj_match.group(1))

        # Etagen
        et_match = re.search(r"Etagen\s*[\n:]*\s*(\d+)", text, re.IGNORECASE)
        if et_match:
            s.etagen = int(et_match.group(1))

        # Calculate price per sqm
        if s.price > 0 and s.wohnflaeche > 0:
            s.price_per_sqm = round(s.price / s.wohnflaeche, 0)

    def _extract_location(self, s: ListingSignals) -> None:
        # PLZ + City pattern: "79111 Baden-Württemberg - Freiburg im Breisgau"
        loc_match = re.search(
            r"(\d{5})\s+(\S+(?:\s+\S+)*?)\s*[-–]\s*(.+?)(?:\n|$)",
            s.raw_text,
        )
        if loc_match:
            s.plz = loc_match.group(1)
            s.bundesland = loc_match.group(2).strip()
            s.city = loc_match.group(3).strip()
        else:
            # Simpler pattern: just PLZ
            plz_match = re.search(r"\b(\d{5})\b", s.raw_text)
            if plz_match:
                s.plz = plz_match.group(1)

        # Location quality hints from description
        text_lower = s.raw_text.lower()
        for hint_pattern, hint_label in [
            (r"am\s+wald|im\s+wald|waldrand|waldnähe", "Waldnähe"),
            (r"ruhige\s+(?:lage|straße|gegend|nachbarschaft)", "ruhige Lage"),
            (r"zentral|innenstadt|stadtmitte|stadtzentrum", "zentrale Lage"),
            (r"am\s+see|seenähe|seeblick", "Seenähe"),
            (r"am\s+fluss|flussnähe", "Flussnähe"),
            (r"am\s+park|parknähe", "Parknähe"),
            (r"aussicht|ausblick|panorama|fernblick", "Aussichtslage"),
            (r"sonnig|südlage|süd-?west", "Sonnenlage"),
        ]:
            if re.search(hint_pattern, text_lower):
                s.location_quality_hints.append(hint_label)

    def _extract_features(self, s: ListingSignals) -> None:
        text = s.raw_text
        seen_contexts: set[str] = set()
        for keyword in UNIQUE_FEATURE_KEYWORDS:
            if keyword.lower() in text.lower():
                # Try to extract the full context around the keyword
                pattern = rf"[^.\n]*{re.escape(keyword)}[^.\n]*"
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    feature_context = match.group(0).strip()
                    # Clean up: remove leading dashes/bullets
                    feature_context = re.sub(r"^[-•–]\s*", "", feature_context)
                    # Deduplicate: skip if we already have this context
                    if feature_context in seen_contexts:
                        continue
                    seen_contexts.add(feature_context)
                    if len(feature_context) < 120:
                        s.unique_features.append(feature_context)
                    else:
                        s.unique_features.append(keyword)
                else:
                    if keyword not in seen_contexts:
                        seen_contexts.add(keyword)
                        s.unique_features.append(keyword)

    def _extract_renovation(self, s: ListingSignals) -> None:
        text = s.raw_text
        for keyword in RENOVATION_KEYWORDS:
            if keyword.lower() in text.lower():
                # Extract the full line containing the keyword
                for line in text.split("\n"):
                    if keyword.lower() in line.lower():
                        cleaned = re.sub(r"^[-•–]\s*", "", line.strip())
                        if cleaned:
                            s.renovation_history = cleaned
                            return

    def _extract_lifestyle(self, s: ListingSignals) -> None:
        text_lower = s.raw_text.lower()
        for keyword in LIFESTYLE_KEYWORDS:
            if keyword.lower() in text_lower:
                s.lifestyle_signals.append(keyword)

    def _extract_amenities(self, s: ListingSignals) -> None:
        amenity_keywords = [
            "Terrasse", "Badewanne", "Gäste-WC", "Keller", "Dachboden",
            "Garage", "Stellplatz", "Garten", "Balkon", "Aufzug",
            "Einbauküche", "Fußbodenheizung", "Klimaanlage",
        ]
        text = s.raw_text
        for kw in amenity_keywords:
            if kw.lower() in text.lower():
                s.amenities.append(kw)

        # Infrastructure
        infra_keywords = ["Glasfaser", "Schule", "Kita", "Kindergarten", "Einkauf", "ÖPNV", "Bushaltestelle", "Straßenbahn", "U-Bahn", "S-Bahn"]
        for kw in infra_keywords:
            if kw.lower() in text.lower():
                s.infrastructure.append(kw)

    def _assess_price(self, s: ListingSignals) -> None:
        if s.price_per_sqm <= 0 or not s.plz:
            s.price_assessment = PriceAssessment.UNKNOWN
            return

        # Look up regional average by 2-digit PLZ prefix
        plz_prefix = s.plz[:2]
        property_key = "haus" if s.property_type in ("Haus", "Mehrfamilienhaus") else "wohnung"

        regional_avg = _MARKET_PRICES.get(plz_prefix, {}).get(property_key, 0)
        if regional_avg <= 0:
            s.price_assessment = PriceAssessment.UNKNOWN
            return

        ratio = s.price_per_sqm / regional_avg
        if ratio < 0.75:
            s.price_assessment = PriceAssessment.BELOW_MARKET
        elif ratio > 1.25:
            s.price_assessment = PriceAssessment.ABOVE_MARKET
        else:
            s.price_assessment = PriceAssessment.AT_MARKET

    def _detect_seller_psychology(self, s: ListingSignals) -> None:
        text = s.raw_text
        text_lower = text.lower()

        # Description effort based on length
        desc_section = ""
        desc_match = re.search(r"Beschreibung\s*\n([\s\S]+?)(?:\n(?:Standort|Anbieter|$))", text)
        if desc_match:
            desc_section = desc_match.group(1)
        else:
            desc_section = text

        word_count = len(desc_section.split())
        if word_count > 150:
            s.description_effort = DescriptionEffort.HIGH
        elif word_count > 50:
            s.description_effort = DescriptionEffort.MEDIUM
        else:
            s.description_effort = DescriptionEffort.LOW

        # Detect urgency
        for kw in URGENCY_KEYWORDS:
            if kw.lower() in text_lower:
                s.seller_emotion = SellerEmotion.URGENT
                return

        # Detect pride (detailed description + emotional language)
        emotional_words = ["herzblut", "liebe", "traum", "paradies", "schmuckstück", "perle", "juwel", "besonders"]
        if s.description_effort == DescriptionEffort.HIGH or any(w in text_lower for w in emotional_words):
            s.seller_emotion = SellerEmotion.PROUD
            return

        s.seller_emotion = SellerEmotion.NEUTRAL

    def _detect_tone(self, s: ListingSignals) -> None:
        text_lower = s.raw_text.lower()

        informal_count = sum(1 for marker in INFORMAL_MARKERS if marker.lower() in text_lower)
        formal_count = sum(1 for marker in FORMAL_MARKERS if marker.lower() in text_lower)

        # Check for explicit "du" usage
        if re.search(r"\b(du|dir|dich|dein|deine|deinem|deinen|deiner|euch|euer|eure)\b", text_lower):
            informal_count += 3

        # Check for explicit "Sie" usage
        if re.search(r"\b(Ihnen|Ihrem|Ihren|Ihrer)\b", s.raw_text):
            formal_count += 3

        # Check for casual punctuation
        if "..." in s.raw_text or s.raw_text.count("!") > 2:
            informal_count += 1

        s.tone = Tone.DU if informal_count > formal_count else Tone.SIE

    def get_market_price(self, plz: str, property_type: str = "haus") -> float:
        """Get the regional market price per sqm for a PLZ prefix."""
        plz_prefix = plz[:2] if len(plz) >= 2 else ""
        property_key = "haus" if property_type in ("Haus", "Mehrfamilienhaus") else "wohnung"
        return _MARKET_PRICES.get(plz_prefix, {}).get(property_key, 0)
