import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { BatchGenerateInputSchema } from "@/lib/validators";
import { batchGenerate, hashContent } from "@/lib/ai/batch-generate";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 batch generations per hour
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
  const parsed = BatchGenerateInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your input and try again", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    // Get existing content hashes for dedup
    const { data: existingRows } = await supabase
      .from("content_hashes")
      .select("hash")
      .eq("user_id", user.id);

    const existingHashes = new Set(
      (existingRows ?? []).map((r: { hash: string }) => r.hash)
    );

    const items = await batchGenerate({
      topic: parsed.data.topic,
      writingStyle: parsed.data.writing_style,
      contentType: parsed.data.content_type,
      tone: parsed.data.tone,
      count: parsed.data.count,
      maxLength: parsed.data.max_length,
      existingHashes,
    });

    // Store new content hashes
    const newHashes = items.map((item) => ({
      user_id: user.id,
      hash: hashContent(item.content),
    }));

    if (newHashes.length > 0) {
      await supabase.from("content_hashes").upsert(newHashes, {
        onConflict: "user_id,hash",
        ignoreDuplicates: true,
      });
    }

    // Log the generation
    await supabase.from("ai_generation_log").insert({ user_id: user.id });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Batch generation error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
