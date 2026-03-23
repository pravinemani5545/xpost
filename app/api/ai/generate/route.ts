import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { GenerateInputSchema } from "@/lib/validators";
import { generateTweetVariations } from "@/lib/ai/generate-variations";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check: 10 calls per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_generation_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if (count !== null && count >= 10) {
    return NextResponse.json(
      { error: "Rate limit reached. Try again in an hour." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = GenerateInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your input and try again", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const variations = await generateTweetVariations(
      parsed.data.topic,
      parsed.data.tone,
      parsed.data.audience
    );

    // Log the generation
    await supabase.from("ai_generation_log").insert({ user_id: user.id });

    return NextResponse.json({ variations });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
