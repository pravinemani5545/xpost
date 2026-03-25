import {
  GoogleGenerativeAI,
  SchemaType,
  type ObjectSchema,
} from "@google/generative-ai";
import type { BatchGeneratedItem, ContentType } from "@/types";
import crypto from "crypto";

function getSystemPrompt(
  contentType: ContentType,
  writingStyle: string,
  maxLength: number
): string {
  const typeInstructions: Record<ContentType, string> = {
    tweet: `Generate unique X (Twitter) posts. Each must be under ${maxLength} characters. Follow a hook-body-CTA structure. No hashtags unless they add real value.`,
    article: `Generate unique long-form X (Twitter) thread starters / article-style posts. Each must be under ${maxLength} characters. These should be substantive, insight-driven posts that could stand alone or open a thread.`,
    reply: `Generate unique replies to specific tweets provided by the user. Each reply must be under ${maxLength} characters. Each reply should add value, offer a unique perspective, or build on the original tweet's idea. Never be generic, sycophantic, or say "great point". Match one reply per tweet provided.`,
  };

  return `You are an expert content writer. ${typeInstructions[contentType]}

WRITING STYLE TO MATCH:
${writingStyle}

RULES:
- Every post must be distinct — different angles, hooks, and structures
- Never repeat the same idea, phrasing, or opening line
- Match the provided writing style closely
- Optimize for genuine insight, not virality
- Each post must be under ${maxLength} characters`;
}

function getBatchSchema(count: number): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      items: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            content: { type: SchemaType.STRING },
            hook_type: { type: SchemaType.STRING },
            estimated_engagement: {
              type: SchemaType.STRING,
              format: "enum",
              enum: ["low", "medium", "high"],
            },
          },
          required: ["content", "hook_type", "estimated_engagement"],
        },
        minItems: count,
        maxItems: count,
      },
    },
    required: ["items"],
  };
}

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export function hashContent(content: string): string {
  return crypto
    .createHash("sha256")
    .update(content.toLowerCase().trim())
    .digest("hex");
}

export async function batchGenerate({
  topic,
  writingStyle,
  contentType,
  tone,
  count,
  maxLength,
  existingHashes,
}: {
  topic: string;
  writingStyle: string;
  contentType: ContentType;
  tone?: string;
  count: number;
  maxLength: number;
  existingHashes: Set<string>;
}): Promise<BatchGeneratedItem[]> {
  const genAI = getGemini();
  const allItems: BatchGeneratedItem[] = [];
  const seenHashes = new Set(existingHashes);

  // Generate in batches of up to 25 to maintain quality
  const batchSize = Math.min(25, count);
  const batches = Math.ceil(count / batchSize);

  for (let i = 0; i < batches && allItems.length < count; i++) {
    const remaining = count - allItems.length;
    const thisBatch = Math.min(batchSize, remaining);
    // Request extra to account for dedup filtering
    const requestCount = Math.min(thisBatch + 5, 30);

    let prompt: string;

    if (contentType === "reply") {
      // For replies, parse the topic as a list of tweets (one per line)
      const tweetLines = topic
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const batchTweets = tweetLines.slice(
        i * batchSize,
        i * batchSize + requestCount
      );
      prompt = [
        `Generate a unique, insightful reply for each of the following tweets:`,
        ...batchTweets.map((t, idx) => `Tweet ${idx + 1}: "${t}"`),
        tone ? `\nTone: ${tone}` : null,
        `\nGenerate exactly ${batchTweets.length} replies, one per tweet above.`,
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      prompt = [
        `Topic: ${topic}`,
        tone ? `Tone: ${tone}` : null,
        `Generate exactly ${requestCount} unique posts.`,
        allItems.length > 0
          ? `ALREADY GENERATED (do NOT repeat these ideas):\n${allItems.map((item, idx) => `${idx + 1}. ${item.content.slice(0, 80)}...`).join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: getSystemPrompt(contentType, writingStyle, maxLength),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: getBatchSchema(requestCount),
        maxOutputTokens: Math.min(requestCount * 200, 8192),
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as {
      items: Omit<BatchGeneratedItem, "content_type">[];
    };

    if (!parsed.items) continue;

    for (const item of parsed.items) {
      if (allItems.length >= count) break;
      if (item.content.length > maxLength) continue;

      const hash = hashContent(item.content);
      if (seenHashes.has(hash)) continue;

      seenHashes.add(hash);
      allItems.push({ ...item, content_type: contentType });
    }
  }

  return allItems;
}
