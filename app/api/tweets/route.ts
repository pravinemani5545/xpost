import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateTweetSchema } from "@/lib/validators";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tweets, error } = await supabase
    .from("tweets")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch tweets" },
      { status: 500 }
    );
  }

  return NextResponse.json(tweets);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateTweetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your input and try again", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: tweet, error } = await supabase
    .from("tweets")
    .insert({
      user_id: user.id,
      content: parsed.data.content,
      scheduled_at: parsed.data.scheduled_at,
      time_slot: parsed.data.time_slot,
      category: parsed.data.category ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A tweet is already scheduled for that time" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create tweet" },
      { status: 500 }
    );
  }

  return NextResponse.json(tweet, { status: 201 });
}
