import { z } from "zod";

export const CreateTweetSchema = z.object({
  content: z
    .string()
    .min(1, { error: "Tweet content is required" })
    .max(280, { error: "Tweet must be 280 characters or fewer" }),
  scheduled_at: z.string().datetime({ error: "Invalid datetime format" }),
  time_slot: z.enum(["9AM", "12PM", "3PM", "6PM", "9PM", "custom"]),
  category: z.string().max(50).nullable().optional(),
});

export const UpdateTweetSchema = z.object({
  content: z
    .string()
    .min(1, { error: "Tweet content is required" })
    .max(280, { error: "Tweet must be 280 characters or fewer" })
    .optional(),
  scheduled_at: z.string().datetime({ error: "Invalid datetime format" }).optional(),
  time_slot: z.enum(["9AM", "12PM", "3PM", "6PM", "9PM", "custom"]).optional(),
  category: z.string().max(50).nullable().optional(),
});

export const GenerateInputSchema = z.object({
  topic: z
    .string()
    .min(10, { error: "Topic must be at least 10 characters" })
    .max(500),
  tone: z.enum(["technical", "casual", "contrarian", "educational"]).optional(),
  audience: z.string().max(200).optional(),
});

export const BatchGenerateInputSchema = z.object({
  topic: z
    .string()
    .min(10, { error: "Topic must be at least 10 characters" })
    .max(1000),
  writing_style: z
    .string()
    .min(10, { error: "Writing style must be at least 10 characters" })
    .max(2000),
  content_type: z.enum(["tweet", "article", "reply"]),
  tone: z.enum(["technical", "casual", "contrarian", "educational"]).optional(),
  count: z.number().int().min(1).max(100),
  max_length: z.number().int().min(50).max(4000),
});

export type CreateTweetInput = z.infer<typeof CreateTweetSchema>;
export type UpdateTweetInput = z.infer<typeof UpdateTweetSchema>;
export type GenerateInput = z.infer<typeof GenerateInputSchema>;
export type BatchGenerateInput = z.infer<typeof BatchGenerateInputSchema>;
