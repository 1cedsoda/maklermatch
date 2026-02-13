"""Manages follow-up timing, suppression rules, and conversation state."""

from __future__ import annotations

import random
from datetime import datetime, timedelta

from .config import (
    FOLLOWUP_1_MAX_DAYS,
    FOLLOWUP_1_MIN_DAYS,
    FOLLOWUP_2_MAX_DAYS,
    FOLLOWUP_2_MIN_DAYS,
    MAX_FOLLOWUPS_PER_SELLER,
)
from .models import (
    ConversationState,
    FollowUpStage,
    ReplySentiment,
)


class FollowUpEngine:
    """Decides when and whether to send follow-up messages."""

    def __init__(self):
        self._conversations: dict[str, ConversationState] = {}
        self._contacted_sellers: set[str] = set()  # Global across all accounts

    def register_conversation(self, state: ConversationState) -> None:
        """Register a new or existing conversation for tracking."""
        self._conversations[state.listing_id] = state
        if state.seller_id:
            self._contacted_sellers.add(state.seller_id)

    def get_conversation(self, listing_id: str) -> ConversationState | None:
        return self._conversations.get(listing_id)

    def is_seller_contacted(self, seller_id: str) -> bool:
        """Check if a seller has already been contacted (across all accounts)."""
        return seller_id in self._contacted_sellers

    def should_followup(self, listing_id: str, now: datetime | None = None) -> bool:
        """Check if a follow-up should be sent now."""
        now = now or datetime.now()
        state = self._conversations.get(listing_id)
        if not state:
            return False

        if state.should_stop():
            return False

        if state.reply_received:
            return False

        if state.current_stage == FollowUpStage.DONE:
            return False

        followups_sent = len(state.messages_sent) - 1  # Subtract initial message
        if followups_sent >= MAX_FOLLOWUPS_PER_SELLER:
            return False

        if state.next_followup_at and now < state.next_followup_at:
            return False

        return True

    def get_next_stage(self, listing_id: str) -> FollowUpStage | None:
        """Get the next follow-up stage for a conversation."""
        state = self._conversations.get(listing_id)
        if not state:
            return None

        if state.current_stage == FollowUpStage.INITIAL:
            return FollowUpStage.FOLLOWUP_1
        elif state.current_stage == FollowUpStage.FOLLOWUP_1:
            return FollowUpStage.FOLLOWUP_2
        else:
            return None

    def schedule_next_followup(self, listing_id: str, now: datetime | None = None) -> datetime | None:
        """Calculate and set the next follow-up time.

        Returns the scheduled time, or None if no more follow-ups.
        """
        now = now or datetime.now()
        state = self._conversations.get(listing_id)
        if not state:
            return None

        next_stage = self.get_next_stage(listing_id)
        if next_stage is None:
            state.current_stage = FollowUpStage.DONE
            return None

        if next_stage == FollowUpStage.FOLLOWUP_1:
            min_days = FOLLOWUP_1_MIN_DAYS
            max_days = FOLLOWUP_1_MAX_DAYS
        else:
            min_days = FOLLOWUP_2_MIN_DAYS
            max_days = FOLLOWUP_2_MAX_DAYS

        delay_days = random.uniform(min_days, max_days)
        scheduled = now + timedelta(days=delay_days)

        # Avoid sending at night (before 8am or after 9pm)
        if scheduled.hour < 8:
            scheduled = scheduled.replace(hour=8, minute=random.randint(0, 59))
        elif scheduled.hour >= 21:
            scheduled = scheduled + timedelta(days=1)
            scheduled = scheduled.replace(hour=8, minute=random.randint(0, 59))

        # Avoid sending on Sundays
        if scheduled.weekday() == 6:  # Sunday
            scheduled = scheduled + timedelta(days=1)

        state.next_followup_at = scheduled
        return scheduled

    def record_message_sent(
        self,
        listing_id: str,
        message,
        now: datetime | None = None,
    ) -> None:
        """Record that a message was sent and advance the conversation state."""
        now = now or datetime.now()
        state = self._conversations.get(listing_id)
        if not state:
            return

        state.messages_sent.append(message)
        state.last_message_at = now

        if not state.first_contact_at:
            state.first_contact_at = now

        # Advance stage
        if message.stage == FollowUpStage.INITIAL:
            state.current_stage = FollowUpStage.INITIAL
        elif message.stage == FollowUpStage.FOLLOWUP_1:
            state.current_stage = FollowUpStage.FOLLOWUP_1
        elif message.stage == FollowUpStage.FOLLOWUP_2:
            state.current_stage = FollowUpStage.FOLLOWUP_2
            # No more follow-ups after stage 2

        # Schedule next follow-up
        self.schedule_next_followup(listing_id, now)

    def record_reply(
        self,
        listing_id: str,
        sentiment: ReplySentiment,
        now: datetime | None = None,
    ) -> None:
        """Record that a reply was received."""
        now = now or datetime.now()
        state = self._conversations.get(listing_id)
        if not state:
            return

        state.reply_received = True
        state.reply_at = now
        state.reply_sentiment = sentiment

        # Stop follow-ups on any reply
        state.next_followup_at = None

        # Mark conversation as inactive on negative replies
        if sentiment in (ReplySentiment.NEGATIVE_POLITE, ReplySentiment.NEGATIVE_AGGRESSIVE):
            state.conversation_active = False

    def record_listing_removed(self, listing_id: str) -> None:
        """Record that a listing is no longer active."""
        state = self._conversations.get(listing_id)
        if state:
            state.listing_still_active = False
            state.conversation_active = False
            state.next_followup_at = None

    def get_due_followups(self, now: datetime | None = None) -> list[str]:
        """Get all listing IDs that are due for a follow-up right now."""
        now = now or datetime.now()
        due = []
        for listing_id, state in self._conversations.items():
            if (
                self.should_followup(listing_id, now)
                and state.next_followup_at
                and now >= state.next_followup_at
            ):
                due.append(listing_id)
        return due

    def get_stats(self) -> dict:
        """Get summary statistics of all conversations."""
        total = len(self._conversations)
        replied = sum(1 for s in self._conversations.values() if s.reply_received)
        active = sum(1 for s in self._conversations.values() if s.conversation_active)
        negative = sum(
            1
            for s in self._conversations.values()
            if s.reply_sentiment
            in (ReplySentiment.NEGATIVE_POLITE, ReplySentiment.NEGATIVE_AGGRESSIVE)
        )

        return {
            "total_conversations": total,
            "replies_received": replied,
            "reply_rate": replied / total if total > 0 else 0,
            "active_conversations": active,
            "negative_replies": negative,
            "sellers_contacted": len(self._contacted_sellers),
        }
