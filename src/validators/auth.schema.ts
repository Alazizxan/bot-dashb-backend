import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  userMarketLink: z.string().min(3, "userMarketLink majburiy"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
