import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { logger } from "../logger";
import { processIncomingEmail } from "./processor";

const log = logger.child({ module: "smtp-receiver" });

let server: SMTPServer | null = null;

export function startSmtpReceiver(): void {
	const port = Number(process.env.SMTP_RECEIVER_PORT) || 2525;

	server = new SMTPServer({
		// No auth required - we accept all inbound mail (catch-all)
		authOptional: true,
		disabledCommands: ["STARTTLS"],

		onData(stream, session, callback) {
			const chunks: Buffer[] = [];

			stream.on("data", (chunk: Buffer) => chunks.push(chunk));
			stream.on("end", async () => {
				try {
					const raw = Buffer.concat(chunks);
					const mail = await simpleParser(raw);

					const from = mail.from?.value[0]?.address || "unknown";
					const to =
						mail.to && !Array.isArray(mail.to) && mail.to.value[0]?.address
							? mail.to.value[0].address
							: Array.isArray(mail.to) && mail.to[0]?.value[0]?.address
								? mail.to[0].value[0].address
								: "unknown";

					log.info({ from, to, subject: mail.subject }, "Received email");

					await processIncomingEmail(mail, from, to);

					callback();
				} catch (err) {
					log.error({ err }, "Failed to process incoming email");
					callback(new Error("Failed to process email"));
				}
			});
		},
	});

	server.on("error", (err) => {
		log.error({ err }, "SMTP server error");
	});

	server.listen(port, () => {
		log.info({ port }, "SMTP receiver listening");
	});
}

export function stopSmtpReceiver(): void {
	if (server) {
		server.close();
		server = null;
	}
}
