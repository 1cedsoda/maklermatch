import type { ParsedMail } from "mailparser";

const KLEINANZEIGEN_DOMAINS = [
	"mail.ebay-kleinanzeigen.de",
	"mail.kleinanzeigen.de",
];

export interface ParsedKleinanzeigenEmail {
	kleinanzeigenAddress: string | null;
	senderName: string | null;
	messageText: string;
	subject: string;
	conversationId: string | null;
	isFromKleinanzeigen: boolean;
	isReply: boolean;
}

/**
 * Extract the anonymized Kleinanzeigen address from a parsed email.
 * The From header contains the anonymized address directly, e.g.:
 *   Nika Neuhold über Kleinanzeigen <12bd0fh3qg7b0r-...-ek-ek@mail.kleinanzeigen.de>
 */
function extractKleinanzeigenAddress(mail: ParsedMail): string | null {
	// Check From header - this IS the anonymized reply-to address
	if (mail.from?.value) {
		for (const addr of mail.from.value) {
			if (addr.address && isKleinanzeigenAddress(addr.address)) {
				return addr.address;
			}
		}
	}

	// Fallback: check Reply-To header
	if (mail.replyTo?.value) {
		for (const addr of mail.replyTo.value) {
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
 * Extract the sender name from the From header.
 * Kleinanzeigen formats it as: "Name über Kleinanzeigen"
 */
function extractSenderName(mail: ParsedMail): string | null {
	const fromName = mail.from?.value?.[0]?.name;
	if (!fromName) return null;

	// Strip " über Kleinanzeigen" suffix
	const match = fromName.match(/^(.+?)\s+über\s+Kleinanzeigen$/i);
	return match ? match[1].trim() : fromName;
}

/**
 * Extract Kleinanzeigen's internal conversation ID from X-Conversation-Id header.
 */
function extractConversationId(mail: ParsedMail): string | null {
	const headers = mail.headers;
	if (!headers) return null;

	const value = headers.get("x-conversation-id");
	if (typeof value === "string") return value;
	return null;
}

/**
 * Extract the actual message text from a Kleinanzeigen notification email.
 *
 * Kleinanzeigen sends HTML-only emails. The message sits inside a grey box:
 *   <td bgcolor="#f0f0f0">
 *     <b>Antwort von</b> Seller Name <br><br>
 *     Actual message text here
 *   </td>
 */
function extractMessageText(mail: ParsedMail): string {
	const html = typeof mail.html === "string" ? mail.html : "";

	if (html) {
		// Extract text from the grey message box (bgcolor="#f0f0f0")
		const msgBoxMatch = html.match(
			/<td[^>]*bgcolor="#f0f0f0"[^>]*>([\s\S]*?)<\/td>/i,
		);

		if (msgBoxMatch) {
			return extractFromMessageBox(msgBoxMatch[1]);
		}

		// Fallback: try background-color style instead of bgcolor attribute
		const bgMatch = html.match(
			/background-color:\s*#f0f0f0[^>]*>([\s\S]*?)<\/td>/i,
		);

		if (bgMatch) {
			return extractFromMessageBox(bgMatch[1]);
		}
	}

	// Last resort: use plaintext if available
	return mail.text?.trim() || stripHtml(html).trim();
}

/**
 * Extract the message from the grey box content.
 * Strips the "Antwort von / Nachricht von" header prefix.
 */
function extractFromMessageBox(boxContent: string): string {
	// The message is after "<b>Antwort von</b> Name <br><br>"
	// or after "<b>Nachricht von</b> Name <br><br>"
	const afterHeader = boxContent.replace(
		/[\s\S]*?<b>[^<]*<\/b>[^<]*<br\s*\/?>\s*<br\s*\/?>/i,
		"",
	);

	const text = stripHtml(afterHeader).trim();
	return text || stripHtml(boxContent).trim();
}

/**
 * Strip HTML tags and decode entities.
 */
function stripHtml(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function parseKleinanzeigenEmail(
	mail: ParsedMail,
): ParsedKleinanzeigenEmail {
	const kleinanzeigenAddress = extractKleinanzeigenAddress(mail);
	const subject = mail.subject || "";

	return {
		kleinanzeigenAddress,
		senderName: extractSenderName(mail),
		messageText: extractMessageText(mail),
		subject,
		conversationId: extractConversationId(mail),
		isFromKleinanzeigen:
			kleinanzeigenAddress !== null ||
			(mail.from?.value.some((a) =>
				a.address?.toLowerCase().includes("kleinanzeigen"),
			) ??
				false),
		// "Re:" in subject indicates this is a reply to our message
		isReply: subject.startsWith("Re:"),
	};
}
