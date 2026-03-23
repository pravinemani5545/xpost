import {
  GoogleGenerativeAI,
  SchemaType,
  type ObjectSchema,
} from "@google/generative-ai";
import type { TweetVariation } from "@/types";

const SYSTEM_PROMPT = `You are an expert X (Twitter) content writer specializing in AI, developer tools, and builder content. Generate exactly 3 tweet variations that are distinct from each other. Each tweet must be under 280 characters, end with a clear perspective or CTA, and follow a hook-body-CTA structure. Optimize for genuine insight, not virality. The audience is technical builders and AI developers. No hashtags unless they add value.`;

const variationsSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    variations: {
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
    },
  },
  required: ["variations"],
};

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export async function generateTweetVariations(
  topic: string,
  tone?: string,
  audience?: string
): Promise<TweetVariation[]> {
  const prompt = [
    `Topic: ${topic}`,
    tone ? `Tone: ${tone}` : null,
    audience ? `Target audience: ${audience}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const genAI = getGemini();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: variationsSchema,
      maxOutputTokens: 512,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as { variations: TweetVariation[] };

  if (!parsed.variations || parsed.variations.length === 0) {
    throw new Error("Failed to generate tweet variations");
  }

  return parsed.variations.slice(0, 3);
}
