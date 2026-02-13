import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { logger } from "../logger";

const log = logger.child({ module: "smtp-sender" });

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
	if (!transport) {
		const mode = process.env.SMTP_MODE || "direct";

		if (mode === "relay") {
			// Relay mode: send through an external SMTP server
			transport = nodemailer.createTransport({
				host: process.env.SMTP_HOST!,
				port: Number(process.env.SMTP_PORT) || 465,
				secure: process.env.SMTP_SECURE !== "false",
				auth: {
					user: process.env.SMTP_USER!,
					pass: process.env.SMTP_PASS!,
				},
				pool: true,
				maxConnections: 3,
			});
		} else {
			// Direct mode: send directly to recipient's MX server
			transport = nodemailer.createTransport({
				direct: true,
				name: process.env.SMTP_HELO_DOMAIN || process.env.SMTP_DOMAIN,
			} as nodemailer.TransportOptions);
		}
	}
	return transport;
}

function getDkimConfig(): Mail.Options["dkim"] {
	const privateKey = process.env.DKIM_PRIVATE_KEY;
	const selector = process.env.DKIM_SELECTOR;
	const domain = process.env.SMTP_DOMAIN;

	if (!privateKey || !selector || !domain) return undefined;

	return {
		domainName: domain,
		keySelector: selector,
		privateKey,
	};
}

export interface SendReplyOptions {
	from: string;
	to: string;
	subject: string;
	body: string;
	inReplyTo?: string;
	references?: string;
}

export async function sendReply(opts: SendReplyOptions): Promise<void> {
	const t = getTransport();
	const dkim = getDkimConfig();

	const mailOpts: Mail.Options = {
		from: opts.from,
		to: opts.to,
		subject: opts.subject,
		text: opts.body,
	};

	if (opts.inReplyTo) {
		mailOpts.inReplyTo = opts.inReplyTo;
		mailOpts.references = opts.references || opts.inReplyTo;
	}

	if (dkim) {
		mailOpts.dkim = dkim;
	}

	const info = await t.sendMail(mailOpts);

	log.info(
		{ messageId: info?.messageId, from: opts.from, to: opts.to },
		"Email sent",
	);
}

export function closeSender(): void {
	if (transport) {
		transport.close();
		transport = null;
	}
}
