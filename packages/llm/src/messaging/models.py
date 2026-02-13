from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Tone(Enum):
    DU = "du"
    SIE = "sie"


class SellerEmotion(Enum):
    PROUD = "proud"
    URGENT = "urgent"
    NEUTRAL = "neutral"
    RELUCTANT = "reluctant"


class DescriptionEffort(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class PriceAssessment(Enum):
    BELOW_MARKET = "below_market"
    AT_MARKET = "at_market"
    ABOVE_MARKET = "above_market"
    UNKNOWN = "unknown"


class MessageVariant(Enum):
    SPECIFIC_OBSERVER = "A"
    MARKET_INSIDER = "B"
    EMPATHETIC_PEER = "C"
    CURIOUS_NEIGHBOR = "D"
    QUIET_EXPERT = "E"
    VALUE_SPOTTER = "F"


class ReplySentiment(Enum):
    POSITIVE_OPEN = "positiv_offen"
    POSITIVE_SHORT = "positiv_kurz"
    NEUTRAL = "neutral"
    NEGATIVE_POLITE = "negativ_ablehnend"
    NEGATIVE_AGGRESSIVE = "negativ_aggressiv"


class FollowUpStage(Enum):
    INITIAL = 0
    FOLLOWUP_1 = 1
    FOLLOWUP_2 = 2
    DONE = 3


@dataclass
class ListingSignals:
    """Structured signals extracted from a raw Kleinanzeigen listing."""

    # Raw input
    raw_text: str
    listing_id: str = ""
    listing_url: str = ""

    # Property identity
    property_type: str = ""  # "Haus", "Wohnung", "Grundstück"
    title: str = ""

    # Financial
    price: int = 0
    price_per_sqm: float = 0.0
    is_vb: bool = False  # "Verhandlungsbasis"
    price_assessment: PriceAssessment = PriceAssessment.UNKNOWN
    provision: str = ""  # "keine", "buyer_pays", etc.

    # Property details
    wohnflaeche: float = 0.0
    grundstueck: float = 0.0
    zimmer: int = 0
    baujahr: int = 0
    etagen: int = 0

    # Location
    plz: str = ""
    city: str = ""
    bundesland: str = ""
    neighborhood: str = ""

    # Description analysis (most important for personalization)
    unique_features: list[str] = field(default_factory=list)
    renovation_history: str = ""
    lifestyle_signals: list[str] = field(default_factory=list)
    infrastructure: list[str] = field(default_factory=list)
    location_quality_hints: list[str] = field(default_factory=list)
    amenities: list[str] = field(default_factory=list)

    # Seller psychology
    seller_emotion: SellerEmotion = SellerEmotion.NEUTRAL
    description_effort: DescriptionEffort = DescriptionEffort.MEDIUM
    tone: Tone = Tone.SIE
    has_provision_note: bool = False
    listing_age_days: int = 0


@dataclass
class PersonalizationResult:
    """Output of the personalization engine — what to emphasize in the message."""

    primary_anchor: str  # The ONE feature to lead with
    secondary_anchors: list[str]  # Backup features for context
    tone: Tone
    recommended_variants: list[MessageVariant]  # Ranked by fit
    price_insight: str | None = None  # e.g. "1.766€/m² vs 3.800€ Marktschnitt"
    emotional_hook: str | None = None  # e.g. "Familienhaus im Wald"


@dataclass
class Message:
    """A generated message ready to be sent or queued."""

    text: str
    variant: MessageVariant
    listing_id: str
    listing_url: str = ""

    # Generation metadata
    generated_at: datetime = field(default_factory=datetime.now)
    spam_guard_score: int = 0
    generation_attempt: int = 1

    # Follow-up tracking
    stage: FollowUpStage = FollowUpStage.INITIAL
    previous_message_id: str | None = None


@dataclass
class ConversationState:
    """Tracks the state of outreach to a single seller."""

    listing_id: str
    listing_url: str
    seller_id: str = ""

    # Messages sent
    messages_sent: list[Message] = field(default_factory=list)
    current_stage: FollowUpStage = FollowUpStage.INITIAL

    # Timing
    first_contact_at: datetime | None = None
    last_message_at: datetime | None = None
    next_followup_at: datetime | None = None

    # Outcomes
    reply_received: bool = False
    reply_at: datetime | None = None
    reply_sentiment: ReplySentiment | None = None
    conversation_active: bool = True  # False = stop all outreach
    listing_still_active: bool = True

    def should_stop(self) -> bool:
        """Check if outreach should stop for this seller."""
        if not self.conversation_active:
            return True
        if not self.listing_still_active:
            return True
        if self.current_stage == FollowUpStage.DONE:
            return True
        if self.reply_sentiment in (
            ReplySentiment.NEGATIVE_POLITE,
            ReplySentiment.NEGATIVE_AGGRESSIVE,
        ):
            return True
        return False
