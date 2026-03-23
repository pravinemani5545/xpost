import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tweet, error } = await supabase
    .from("tweets")
    .update({
      status: "posted",
      posted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "scheduled")
    .select()
    .single();

  if (error || !tweet) {
    return NextResponse.json(
      { error: "Failed to mark tweet as posted" },
      { status: 500 }
    );
  }

  return NextResponse.json(tweet);
}
