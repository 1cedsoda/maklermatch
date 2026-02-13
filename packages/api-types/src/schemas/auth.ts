import { z } from "zod";

export const loginRequestSchema = z.object({
	username: z.string(),
	password: z.string(),
});

export const loginResponseSchema = z.object({
	token: z.string(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
