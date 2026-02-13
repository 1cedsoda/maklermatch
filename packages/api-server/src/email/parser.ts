import type { ParsedMail } from "mailparser";

const KLEINANZEIGEN_DOMAINS = [
	"mail.ebay-kleinanzeigen.de",
	"mail.kleinanzeigen.de",
];

export interface ParsedKleinanzeigenEmail {
	kleinanzeigenAddress: string | null;
	messageText: string;
	subject: string;
	isFromKleinanzeigen: boolean;
}

/**
 * Extract the anonymized Kleinanzeigen reply-to address from a parsed email.
 * Checks Reply-To first, then From.
 */
function extractKleinanzeigenAddress(mail: ParsedMail): string | null {
	// Check Reply-To header first
	if (mail.replyTo?.value) {
		for (const addr of mail.replyTo.value) {
			if (addr.address && isKleinanzeigenAddress(addr.address)) {
				return addr.address;
			}
		}
	}

	// Check From header
	if (mail.from?.value) {
		for (const addr of mail.from.value) {
			if (addr.address && isKleinanzeigenAddress(addr.address)) {
				return addr.address;
			}
		}
	}

	return null;
}

function isKleinanzeigenAddress(address: string): boolean {
	const domain = address.split("@")[1]?.toLowerCase();
	return KLEINANZEIGEN_DOMAINS.includes(domain ?? "");
}

/**
 * Extract the actual message text from a Kleinanzeigen notification email.
 * Strips the template wrapper (header/footer) to get just the seller's message.
 */
function extractMessageText(mail: ParsedMail): string {
	// Prefer plain text over HTML
	const text = mail.text || "";

	// Kleinanzeigen wraps messages in a template. The actual message content
	// is typically between recognizable markers. We'll try common patterns
	// and fall back to the full text if no pattern matches.

	// Pattern: Message is between "hat dir eine Nachricht geschickt" and footer links
	const lines = text.split("\n");
	const messageLines: string[] = [];
	let inMessage = false;

	for (const line of lines) {
		const trimmed = line.trim();

		// Start capturing after the notification header
		if (
			trimmed.includes("Nachricht geschickt") ||
			trimmed.includes("hat geantwortet") ||
			trimmed.includes("neue Nachricht")
		) {
			inMessage = true;
			continue;
		}

		// Stop at footer markers
		if (
			inMessage &&
			(trimmed.startsWith("---") ||
				trimmed.includes("kleinanzeigen.de") ||
				trimmed.includes("Impressum") ||
				trimmed.includes("Abmelden") ||
				trimmed.includes("Diese E-Mail wurde") ||
				trimmed.startsWith("Anzeige ansehen"))
		) {
			break;
		}

		if (inMessage && trimmed.length > 0) {
			messageLines.push(trimmed);
		}
	}

	// If we extracted something meaningful, return it. Otherwise return full text.
	const extracted = messageLines.join("\n").trim();
	return extracted.length > 5 ? extracted : text.trim();
}

export function parseKleinanzeigenEmail(
	mail: ParsedMail,
): ParsedKleinanzeigenEmail {
	const kleinanzeigenAddress = extractKleinanzeigenAddress(mail);

	return {
		kleinanzeigenAddress,
		messageText: extractMessageText(mail),
		subject: mail.subject || "",
		isFromKleinanzeigen:
			kleinanzeigenAddress !== null ||
			(mail.from?.value.some((a) =>
				a.address?.toLowerCase().includes("kleinanzeigen"),
			) ??
				false),
	};
}
