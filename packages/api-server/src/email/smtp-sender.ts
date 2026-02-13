import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "../logger";

const log = logger.child({ module: "smtp-sender" });

let transport: Transporter | null = null;

function getTransport(): Transporter {
	if (!transport) {
		transport = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT) || 465,
			secure: process.env.SMTP_SECURE !== "false",
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
			pool: true,
			maxConnections: 3,
		});
	}
	return transport;
}

export interface SendReplyOptions {
	to: string;
	subject: string;
	body: string;
	inReplyTo?: string;
	references?: string;
}

export async function sendReply(opts: SendReplyOptions): Promise<void> {
	const from = process.env.SMTP_FROM;
	if (!from) throw new Error("SMTP_FROM not configured");

	const t = getTransport();

	const info = await t.sendMail({
		from,
		to: opts.to,
		subject: opts.subject,
		text: opts.body,
		...(opts.inReplyTo && {
			inReplyTo: opts.inReplyTo,
			references: opts.references || opts.inReplyTo,
		}),
	});

	log.info({ messageId: info.messageId, to: opts.to }, "Email sent");
}

export function closeSender(): void {
	if (transport) {
		transport.close();
		transport = null;
	}
}
