import {
	FOLLOWUP_1_MAX_DAYS,
	FOLLOWUP_1_MIN_DAYS,
	FOLLOWUP_2_MAX_DAYS,
	FOLLOWUP_2_MIN_DAYS,
	MAX_FOLLOWUPS_PER_SELLER,
} from "./config";
import {
	type ConversationState,
	type Message,
	FollowUpStage,
	ReplySentiment,
	shouldStop,
} from "./models";

export class FollowUpEngine {
	private conversations = new Map<string, ConversationState>();
	private contactedSellers = new Set<string>();

	registerConversation(state: ConversationState): void {
		this.conversations.set(state.listingId, state);
		if (state.sellerId) this.contactedSellers.add(state.sellerId);
	}

	getConversation(listingId: string): ConversationState | undefined {
		return this.conversations.get(listingId);
	}

	isSellerContacted(sellerId: string): boolean {
		return this.contactedSellers.has(sellerId);
	}

	shouldFollowup(listingId: string, now = new Date()): boolean {
		const state = this.conversations.get(listingId);
		if (!state) return false;
		if (shouldStop(state)) return false;
		if (state.replyReceived) return false;
		if (state.currentStage === FollowUpStage.DONE) return false;

		const followupsSent = state.messagesSent.length - 1;
		if (followupsSent >= MAX_FOLLOWUPS_PER_SELLER) return false;

		if (state.nextFollowupAt && now < state.nextFollowupAt) return false;

		return true;
	}

	getNextStage(listingId: string): FollowUpStage | null {
		const state = this.conversations.get(listingId);
		if (!state) return null;

		if (state.currentStage === FollowUpStage.INITIAL)
			return FollowUpStage.FOLLOWUP_1;
		if (state.currentStage === FollowUpStage.FOLLOWUP_1)
			return FollowUpStage.FOLLOWUP_2;
		return null;
	}

	scheduleNextFollowup(listingId: string, now = new Date()): Date | null {
		const state = this.conversations.get(listingId);
		if (!state) return null;

		const nextStage = this.getNextStage(listingId);
		if (nextStage === null) {
			state.currentStage = FollowUpStage.DONE;
			return null;
		}

		const [minDays, maxDays] =
			nextStage === FollowUpStage.FOLLOWUP_1
				? [FOLLOWUP_1_MIN_DAYS, FOLLOWUP_1_MAX_DAYS]
				: [FOLLOWUP_2_MIN_DAYS, FOLLOWUP_2_MAX_DAYS];

		const delayDays = minDays + Math.random() * (maxDays - minDays);
		const scheduled = new Date(now.getTime() + delayDays * 86400000);

		// Avoid sending at night (before 8am or after 9pm)
		if (scheduled.getHours() < 8) {
			scheduled.setHours(8, Math.floor(Math.random() * 60));
		} else if (scheduled.getHours() >= 21) {
			scheduled.setDate(scheduled.getDate() + 1);
			scheduled.setHours(8, Math.floor(Math.random() * 60));
		}

		// Avoid sending on Sundays
		if (scheduled.getDay() === 0) {
			scheduled.setDate(scheduled.getDate() + 1);
		}

		state.nextFollowupAt = scheduled;
		return scheduled;
	}

	recordMessageSent(
		listingId: string,
		message: Message,
		now = new Date(),
	): void {
		const state = this.conversations.get(listingId);
		if (!state) return;

		state.messagesSent.push(message);
		state.lastMessageAt = now;

		if (!state.firstContactAt) state.firstContactAt = now;

		if (message.stage === FollowUpStage.INITIAL) {
			state.currentStage = FollowUpStage.INITIAL;
		} else if (message.stage === FollowUpStage.FOLLOWUP_1) {
			state.currentStage = FollowUpStage.FOLLOWUP_1;
		} else if (message.stage === FollowUpStage.FOLLOWUP_2) {
			state.currentStage = FollowUpStage.FOLLOWUP_2;
		}

		this.scheduleNextFollowup(listingId, now);
	}

	recordReply(
		listingId: string,
		sentiment: ReplySentiment,
		now = new Date(),
	): void {
		const state = this.conversations.get(listingId);
		if (!state) return;

		state.replyReceived = true;
		state.replyAt = now;
		state.replySentiment = sentiment;
		state.nextFollowupAt = null;

		if (
			sentiment === ReplySentiment.NEGATIVE_POLITE ||
			sentiment === ReplySentiment.NEGATIVE_AGGRESSIVE
		) {
			state.conversationActive = false;
		}
	}

	recordListingRemoved(listingId: string): void {
		const state = this.conversations.get(listingId);
		if (state) {
			state.listingStillActive = false;
			state.conversationActive = false;
			state.nextFollowupAt = null;
		}
	}

	getDueFollowups(now = new Date()): string[] {
		const due: string[] = [];
		for (const [listingId, state] of this.conversations) {
			if (
				this.shouldFollowup(listingId, now) &&
				state.nextFollowupAt &&
				now >= state.nextFollowupAt
			) {
				due.push(listingId);
			}
		}
		return due;
	}

	getStats(): {
		totalConversations: number;
		repliesReceived: number;
		replyRate: number;
		activeConversations: number;
		negativeReplies: number;
		sellersContacted: number;
	} {
		const total = this.conversations.size;
		let replied = 0;
		let active = 0;
		let negative = 0;

		for (const s of this.conversations.values()) {
			if (s.replyReceived) replied++;
			if (s.conversationActive) active++;
			if (
				s.replySentiment === ReplySentiment.NEGATIVE_POLITE ||
				s.replySentiment === ReplySentiment.NEGATIVE_AGGRESSIVE
			)
				negative++;
		}

		return {
			totalConversations: total,
			repliesReceived: replied,
			replyRate: total > 0 ? replied / total : 0,
			activeConversations: active,
			negativeReplies: negative,
			sellersContacted: this.contactedSellers.size,
		};
	}
}
